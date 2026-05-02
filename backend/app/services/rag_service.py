import os
import glob
import json
import uuid
from datetime import datetime
from langchain_community.vectorstores import Pinecone as PineconeLangchain
from langchain_core.embeddings import Embeddings
from langchain_groq import ChatGroq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from pinecone import Pinecone, ServerlessSpec
from pydantic import Field
from typing import Any, List
from langchain_core.retrievers import BaseRetriever
from app.core.config import settings
from app.services.wikipedia_service import get_wiki_context
from app.services.scraper import get_live_context

from langchain.agents import create_agent
from app.services.agent_tools import fast_scrape_university_news, deep_scrape_with_playwright, search_wikipedia_topic

# Global variables
qa_chain = None
agent_executor = None
retriever_global = None
llm_global = None
QA_CHAIN_PROMPT = None

# Custom Embeddings class using native Pinecone Inference API
class NativePineconeEmbeddings(Embeddings):
    def __init__(self, pc_client, model="multilingual-e5-large"):
        self.pc = pc_client
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        res = self.pc.inference.embed(
            model=self.model,
            inputs=texts,
            parameters={"input_type": "passage", "truncate": "END"}
        )
        return [r['values'] for r in res.data]

    def embed_query(self, text: str) -> list[float]:
        res = self.pc.inference.embed(
            model=self.model,
            inputs=[text],
            parameters={"input_type": "query", "truncate": "END"}
        )
        return res.data[0]['values']


# Custom Native Retriever
class PineconeNativeRetriever(BaseRetriever):
    index: Any
    embeddings: Any
    text_key: str = "text"
    top_k: int = 5

    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        query_emb = self.embeddings.embed_query(query)
        res = self.index.query(vector=query_emb, top_k=self.top_k, include_metadata=True)
        docs = []
        for match in res["matches"]:
            metadata = match["metadata"].copy()
            text = metadata.pop(self.text_key, "")
            docs.append(Document(page_content=text, metadata=metadata))
        return docs

def get_vector_store_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "vector_store")

def init_rag():
    global qa_chain, retriever_global, llm_global, agent_executor
    
    if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY:
        print("Warning: GROQ_API_KEY or PINECONE_API_KEY not set. RAG will return mock responses.")
        return

    try:
        # Initialize Pinecone Client directly
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index_name = settings.PINECONE_INDEX_NAME

        # Check if index exists, otherwise create it
        if index_name not in [index_info["name"] for index_info in pc.list_indexes()]:
            pc.create_index(
                name=index_name,
                dimension=1024,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        # Initialize our custom dependency-free embeddings
        embeddings = NativePineconeEmbeddings(pc_client=pc)

        # ── Load .docx files from vector_store folder ──
        from docx import Document as DocxDocument
        vector_store_path = get_vector_store_path()
        docx_files = glob.glob(os.path.join(vector_store_path, "*.docx"))
        
        docs = []
        
        for docx_path in docx_files:
            filename = os.path.basename(docx_path)
            print(f"Loading knowledge from: {filename}")
            try:
                docx_doc = DocxDocument(docx_path)
                
                # Extract paragraphs (group consecutive non-empty paragraphs)
                current_section = []
                section_heading = filename
                for para in docx_doc.paragraphs:
                    text = para.text.strip()
                    if not text:
                        # Empty line = section break, flush current section
                        if current_section:
                            docs.append(Document(
                                page_content="\n".join(current_section),
                                metadata={"source": filename, "section": section_heading}
                            ))
                            current_section = []
                        continue
                    # Track headings for metadata
                    if para.style and para.style.name and 'Heading' in para.style.name:
                        # Flush previous section
                        if current_section:
                            docs.append(Document(
                                page_content="\n".join(current_section),
                                metadata={"source": filename, "section": section_heading}
                            ))
                            current_section = []
                        section_heading = text
                    current_section.append(text)
                # Flush final section
                if current_section:
                    docs.append(Document(
                        page_content="\n".join(current_section),
                        metadata={"source": filename, "section": section_heading}
                    ))
                
                # Extract tables
                for table_idx, table in enumerate(docx_doc.tables):
                    rows = []
                    for row in table.rows:
                        cells = [cell.text.strip() for cell in row.cells]
                        rows.append(" | ".join(cells))
                    if rows:
                        table_text = "\n".join(rows)
                        docs.append(Document(
                            page_content=table_text,
                            metadata={"source": filename, "section": f"Table {table_idx + 1}"}
                        ))
                
                print(f"  → Extracted {len([d for d in docs if d.metadata.get('source') == filename])} chunks from {filename}")
            except Exception as e:
                print(f"  ✗ Error loading {filename}: {e}")
        
        if not docx_files:
            print("Warning: No .docx files found in vector_store folder.")

        # ── Verification Data ──
        ver_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "verification_data.json")
        try:
            with open(ver_path, "r") as f:
                ver_data = json.load(f)

            for slip in ver_data.get("bank_slips", []):
                content = (
                    f"Bank Slip Verification Record\n"
                    f"Reference No: {slip['reference_no']}\n"
                    f"Challan No: {slip['challan_no']}\n"
                    f"Student Name: {slip['student_name']}\n"
                    f"Program: {slip['program']}\n"
                    f"Semester: {slip['semester']}\n"
                    f"Fee Type: {slip['fee_type']}\n"
                    f"Amount: Rs. {slip['amount']:,}\n"
                    f"Bank: {slip['bank']}\n"
                    f"Branch: {slip['branch']}\n"
                    f"Payment Date: {slip['payment_date']}\n"
                    f"Status: {slip['status']}"
                )
                docs.append(Document(page_content=content, metadata={"source": "bank_slip", "ref": slip["reference_no"]}))

            for slip in ver_data.get("roll_number_slips", []):
                content = (
                    f"Roll Number Slip Verification Record\n"
                    f"Roll No: {slip['roll_no']}\n"
                    f"Student Name: {slip['student_name']}\n"
                    f"Father's Name: {slip['father_name']}\n"
                    f"Program: {slip['program']}\n"
                    f"Department: {slip['department']}\n"
                    f"Semester: {slip['semester']}\n"
                    f"Section: {slip['section']}\n"
                    f"Exam Type: {slip['exam_type']}\n"
                    f"Exam Session: {slip['exam_session']}\n"
                    f"Exam Start Date: {slip['exam_start_date']}\n"
                    f"Exam End Date: {slip['exam_end_date']}\n"
                    f"Exam Center: {slip['exam_center']}\n"
                    f"Subjects: {', '.join(slip.get('subjects', []))}\n"
                    f"Issued Date: {slip['issued_date']}\n"
                    f"Status: {slip['status']}"
                )
                docs.append(Document(page_content=content, metadata={"source": "roll_slip", "roll_no": slip["roll_no"]}))
        except Exception as e:
            print(f"Could not load verification data: {e}")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
        splits = text_splitter.split_documents(docs)

        index = pc.Index(index_name)
        
        # Re-index if the number of stored vectors differs from our current document count
        stats = index.describe_index_stats()
        if stats.total_vector_count != len(splits):
            # Clear old vectors first if switching data sources
            if stats.total_vector_count > 0:
                index.delete(delete_all=True)
                print(f"Cleared {stats.total_vector_count} old vectors from Pinecone.")
            vectors = []
            texts = [doc.page_content for doc in splits]
            embeds = embeddings.embed_documents(texts)
            for i, doc in enumerate(splits):
                metadata = doc.metadata.copy()
                metadata["text"] = doc.page_content
                vectors.append({
                    "id": str(uuid.uuid4()),
                    "values": embeds[i],
                    "metadata": metadata
                })
            # Upsert in batches to avoid payload limits
            batch_size = 50
            for i in range(0, len(vectors), batch_size):
                index.upsert(vectors=vectors[i:i+batch_size])
            print(f"Indexed {len(vectors)} document chunks into Pinecone.")

        retriever_global = PineconeNativeRetriever(index=index, embeddings=embeddings)

        # Create LLM
        llm_global = ChatGroq(
            temperature=0.2,
            model_name="llama-3.1-8b-instant",
            api_key=settings.GROQ_API_KEY
        )

        template = """You are UoS Assistant, the official AI agent for the University of Swat (UoS), Pakistan.

CURRENT DATE & TIME: {current_datetime}

---

## YOUR TOOLS (the ONLY functions you can call):
You have exactly 3 tools. Do NOT try to call anything else:
1. `fast_scrape_university_news` — scrapes uswat.edu.pk for the latest news/announcements. Takes no arguments.
2. `deep_scrape_with_playwright` — deep-scrapes a specific URL. Takes one argument: `url` (string).
3. `search_wikipedia_topic` — searches Wikipedia for a topic. Takes one argument: `query` (string).

If the user asks something you already know from the context below, just answer directly — no need to call any tool.

---

## WIDGET SYSTEM (these are NOT tools — they are text tokens you write in your reply):

You can attach ONE special widget token at the very end of your reply. The widget system renders rich interactive UI components for the user automatically.

### Available widgets:
| Question type              | Append at the end of your reply     |
|----------------------------|--------------------------------------|
| Admissions / how to apply  | [WIDGET:admission]                   |
| Location / where is campus | [WIDGET:map]                         |
| List of programs / courses | [WIDGET:programs]                    |
| Contact details            | [WIDGET:contact]                     |
| Fee structure              | [WIDGET:fees]                        |
| Social media / follow us   | [WIDGET:social]                      |
| Bank slip with REAL ref no | [WIDGET:bank_slip:UOS-2026-001234]   |
| Roll slip with REAL roll no| [WIDGET:roll_slip:CS-2026-F-001]     |
| External website link      | [WIDGET:link:https://uswat.edu.pk Official UoS Website] |

### CRITICAL WIDGET RULES — READ CAREFULLY:
1. **Widgets are NOT tools.** They are plain text tokens you append to your response text. Do NOT attempt to call them as tool functions. Just write the token literally in your reply, e.g. `[WIDGET:programs]`.
2. **NEVER output a widget token with a placeholder** like `<REF_NO>`, `<ROLL_NO>`, `YOUR_NUMBER`, etc.
3. **ONLY output [WIDGET:bank_slip:X]** if the student's message contains an ACTUAL reference number (e.g. UOS-2026-001234). If they haven't given one yet, just ask them to share it — do NOT output any widget.
4. **ONLY output [WIDGET:roll_slip:X]** if the student's message contains an ACTUAL roll number (e.g. CS-2026-F-001). If they haven't given one yet, just ask them to share it — do NOT output any widget.
5. **Never output the widget in the middle of text** — always at the very end, on its own line.
6. **Never repeat a widget** — output each widget type at most once per reply.
7. **Never explain or mention the widget** — just append it silently.

### Verification flow:
- If student asks HOW to verify → explain the process and say "Please share your reference number / roll number and I'll look it up instantly."
- If student PROVIDES a number → look it up in the context and output the matching widget.

---

## WHAT YOU HANDLE:
1. **General info** — history, vice chancellor, campus area, vision, mission.
2. **Programs** — list all programs with eligibility, duration, description.
3. **Admissions** — status, opening/closing dates, entry test, merit list, required documents.
4. **Fees & Scholarships** — per semester fees for BS/MS/PhD/Pharm-D, hostel, scholarships.
5. **Verification** — ONLY when student gives a REAL number.
6. **Location / Contact** — full address, phone, directions.

## TONE & RESPONSE GUIDELINES:
1. **Be professional but natural and friendly.** You represent the university, so be helpful and welcoming. Emojis are allowed but keep them professional (e.g. 🎓, 📍, ✅).
2. **Be concise and direct.** Do not use long-winded greetings unless it's the very first message.
3. **Do not volunteer the current date and time** unless the user explicitly asks for it.
4. Always use **actual data** from the context. Never be vague.
5. Format with **bold**, bullet points, numbered lists for readability.
6. If data is missing: suggest visiting uswat.edu.pk or calling +92-946-9240066.

Context from University Knowledge Base:
{context}
"""

        global QA_CHAIN_PROMPT
        QA_CHAIN_PROMPT = template

        # Create Agent
        tools = [fast_scrape_university_news, deep_scrape_with_playwright, search_wikipedia_topic]
        agent_executor = create_agent(model=llm_global, tools=tools, system_prompt=template)

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        def get_datetime(_):
            now = datetime.now()
            return now.strftime("%A, %B %d, %Y at %I:%M %p (Pakistan Standard Time)")

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", template),
            ("human", "{question}")
        ])

        qa_chain = (
            {
                "context": retriever_global | format_docs,
                "question": RunnablePassthrough(),
                "current_datetime": RunnableLambda(get_datetime)
            }
            | qa_prompt
            | llm_global
            | StrOutputParser()
        )
        print("Pinecone & Groq Agent Pipeline initialized successfully.")
    except Exception as e:
        print(f"Error initializing RAG: {e}")

def _build_enriched_context(query: str, pinecone_docs: str) -> str:
    """Combine Pinecone docs + live scraper + Wikipedia into one context string."""
    parts = [pinecone_docs]

    # Live web scraper (university website news/announcements)
    try:
        live = get_live_context()
        if live:
            parts.append(live)
    except Exception:
        pass

    # Wikipedia agentic tool
    try:
        wiki = get_wiki_context(query)
        if wiki:
            parts.append("\n--- Wikipedia Context (Live) ---\n" + wiki)
    except Exception:
        pass

    return "\n\n".join(filter(None, parts))


def query_rag(query: str) -> str:
    if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY or qa_chain is None:
        return f"Mock response to: {query} (Please set GROQ_API_KEY and PINECONE_API_KEY in .env to enable AI)"
    try:
        return qa_chain.invoke(query)
    except Exception as e:
        return f"Error processing query: {str(e)}"


async def query_rag_stream(query: str, history: list = None):
    """Async generator that streams tokens using the AgentExecutor."""
    if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY or agent_executor is None:
        mock = "Mock response: set GROQ_API_KEY and PINECONE_API_KEY in .env to enable AI."
        for word in mock.split():
            yield word + " "
        return

    try:
        # Build enriched context from Pinecone (base knowledge)
        pinecone_docs_list = retriever_global.invoke(query)
        pinecone_text = "\n\n".join(d.page_content for d in pinecone_docs_list)
        # Note: We omit auto-scraping here because the agent has tools to do it if needed!
        enriched_context = pinecone_text
        current_datetime = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p (Pakistan Standard Time)")

        # Format History into LangChain messages
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
        messages = []
        
        # Inject dynamic system prompt at the start of each request
        full_system_prompt = QA_CHAIN_PROMPT.format(
            context=enriched_context,
            current_datetime=current_datetime
        )
        messages.append(SystemMessage(content=full_system_prompt))

        if history:
            for msg in history:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg.get("content")))
                else:
                    messages.append(AIMessage(content=msg.get("content")))

        # Append Current Question
        messages.append(HumanMessage(content=query))

        # Run agent stream
        try:
            async for msg, metadata in agent_executor.astream(
                {"messages": messages},
                stream_mode="messages"
            ):
                if hasattr(msg, "content") and msg.content:
                    yield msg.content
        except Exception as e:
            error_str = str(e)
            # If the LLM hallucinated a bad tool call, fall back to direct LLM response
            if "failed_generation" in error_str or "not in request.tools" in error_str or "validation failed" in error_str:
                try:
                    fallback_response = await llm_global.ainvoke(messages)
                    if fallback_response and fallback_response.content:
                        yield fallback_response.content
                except Exception as fallback_e:
                    yield f"I apologize, I encountered an issue processing your request. Please try rephrasing your question."
            else:
                yield f"Error in agent stream: {error_str}"
    except Exception as e:
        yield f"Error processing query: {str(e)}"


# Initialize on import
init_rag()
