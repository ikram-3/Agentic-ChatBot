import os
import asyncio
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
from typing import Any, List, AsyncGenerator
from langchain_core.retrievers import BaseRetriever
from app.core.config import settings
from app.services.wikipedia_service import get_wiki_context
from app.services.scraper import get_live_context

from langchain.agents import create_agent
from app.services.agent_tools import fast_scrape_university_news, deep_scrape_with_playwright, search_wikipedia_topic

qa_chain = None
agent_executor = None
retriever_global = None
llm_global = None          
planner_llm = None
QA_CHAIN_PROMPT = None

TOOL_DISPLAY_NAMES = {
    "fast_scrape_university_news":  {"label": "Checking University Website",  "icon": "🌐"},
    "deep_scrape_with_playwright":  {"label": "Deep Reading Web Page",         "icon": "🕸️"},
    "search_wikipedia_topic":       {"label": "Searching Wikipedia",           "icon": "📖"},
    "WikipediaQueryRun":            {"label": "Searching Wikipedia",           "icon": "📖"},
    "Calculator":                   {"label": "Running Calculation",           "icon": "🧮"},
}

def get_tool_display(tool_name: str) -> dict:
    """Return a human-friendly display dict for a tool name."""
    return TOOL_DISPLAY_NAMES.get(
        tool_name,
        {"label": tool_name.replace("_", " ").title(), "icon": "⚙️"}
    )

# ── Custom Embeddings ─────────────────────────────────────────────────────────
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

    def embed_query(self, text: Any) -> list[float]:
        # Safety check: if text is a dict (from a chain), extract the string
        if isinstance(text, dict):
            text = text.get("question", text.get("text", str(text)))
        
        res = self.pc.inference.embed(
            model=self.model,
            inputs=[text],
            parameters={"input_type": "query", "truncate": "END"}
        )
        return res.data[0]['values']


# ── Custom Native Retriever ───────────────────────────────────────────────────
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


# ── RAG Initialization ────────────────────────────────────────────────────────
def init_rag():
    global qa_chain, retriever_global, llm_global, planner_llm, agent_executor

    # ── Check for keys ───────────────────────────────────────────────────────
    missing_keys = []
    if not settings.GROQ_API_KEY: missing_keys.append("GROQ_API_KEY")
    if not settings.PINECONE_API_KEY: missing_keys.append("PINECONE_API_KEY")
    
    if missing_keys:
        print(f"⚠️ [RAG] Missing API keys: {', '.join(missing_keys)}. AI will return mock responses.")
        return

    try:
        # ── Pinecone setup with retry ─────────────────────────────────────────
        import time
        pc = None
        for attempt in range(3):
            try:
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                index_name = settings.PINECONE_INDEX_NAME
                all_indexes = [index_info["name"] for index_info in pc.list_indexes()]
                break
            except Exception as e:
                if attempt == 2: raise e
                print(f"⚠️ [Pinecone] Connection attempt {attempt+1} failed. Retrying...")
                time.sleep(2)

        if index_name not in all_indexes:
            pc.create_index(
                name=index_name,
                dimension=1024,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )

        embeddings = NativePineconeEmbeddings(pc_client=pc)

        # ── Load .docx files ──────────────────────────────────────────────────
        from docx import Document as DocxDocument
        vector_store_path = get_vector_store_path()
        docx_files = glob.glob(os.path.join(vector_store_path, "*.docx"))

        docs = []
        for docx_path in docx_files:
            filename = os.path.basename(docx_path)
            print(f"Loading knowledge from: {filename}")
            try:
                docx_doc = DocxDocument(docx_path)
                current_section = []
                section_heading = filename
                for para in docx_doc.paragraphs:
                    text = para.text.strip()
                    if not text:
                        if current_section:
                            docs.append(Document(
                                page_content="\n".join(current_section),
                                metadata={"source": filename, "section": section_heading}
                            ))
                            current_section = []
                        continue
                    if para.style and para.style.name and 'Heading' in para.style.name:
                        if current_section:
                            docs.append(Document(
                                page_content="\n".join(current_section),
                                metadata={"source": filename, "section": section_heading}
                            ))
                            current_section = []
                        section_heading = text
                    current_section.append(text)
                if current_section:
                    docs.append(Document(
                        page_content="\n".join(current_section),
                        metadata={"source": filename, "section": section_heading}
                    ))
                for table_idx, table in enumerate(docx_doc.tables):
                    rows = []
                    for row in table.rows:
                        cells = [cell.text.strip() for cell in row.cells]
                        rows.append(" | ".join(cells))
                    if rows:
                        docs.append(Document(
                            page_content="\n".join(rows),
                            metadata={"source": filename, "section": f"Table {table_idx + 1}"}
                        ))
                print(f"  -> Extracted {len([d for d in docs if d.metadata.get('source') == filename])} chunks from {filename}")
            except Exception as e:
                print(f"  [X] Error loading {filename}: {e}")

        if not docx_files:
            print("Warning: No .docx files found in vector_store folder.")

        # ── Verification data ─────────────────────────────────────────────────
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

        # ── Checksum-based Indexing ──────────────────────────────────────────
        import hashlib
        def get_content_hash(docs):
            content = "".join(d.page_content for d in docs)
            return hashlib.md5(content.encode()).hexdigest()

        current_hash = get_content_hash(splits)
        hash_file = os.path.join(vector_store_path, "index_hash.txt")
        
        stored_hash = ""
        if os.path.exists(hash_file):
            try:
                with open(hash_file, "r") as f:
                    stored_hash = f.read().strip()
            except Exception: pass

        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        
        needs_reindex = (stored_hash != current_hash) or (stats.total_vector_count == 0)

        if needs_reindex:
            if stats.total_vector_count > 0:
                index.delete(delete_all=True)
                print(f"Cleared {stats.total_vector_count} old vectors from Pinecone.")
            
            print(f"Indexing {len(splits)} chunks into Pinecone...")
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
            
            batch_size = 50
            for i in range(0, len(vectors), batch_size):
                index.upsert(vectors=vectors[i:i+batch_size])
            
            with open(hash_file, "w") as f:
                f.write(current_hash)
            print(f"Successfully indexed {len(vectors)} document chunks.")
        else:
            print("Pinecone index is up to date. Skipping re-indexing.")

        retriever_global = PineconeNativeRetriever(index=index, embeddings=embeddings)

        # ── Model 2: Responder ────────────────────────────────────────────────
        llm_global = ChatGroq(
            temperature=0.7,
            model_name="llama-3.1-8b-instant",   
            api_key=settings.GROQ_API_KEY
        )

        # ── Model 1: Planner (same model, lower temperature) ─────────────────
        planner_llm = ChatGroq(
            temperature=0.1,
            model_name="llama-3.1-8b-instant",
            api_key=settings.GROQ_API_KEY
        )

        # ── System Prompt ─────────────────────────────────────────────────────
        template = """You are UoS Assistant, the official AI agent for the University of Swat (UoS), Pakistan.

CURRENT DATE & TIME: {current_datetime}

---

## YOUR TOOLS (the ONLY functions you can call):
You have exactly 6 tools. Do NOT try to call anything else:
1. `fast_scrape_university_news` — scrapes uswat.edu.pk for the latest news.
2. `deep_scrape_with_playwright` — deep-scrapes a specific URL.
3. `search_wikipedia_topic` — searches Wikipedia for general knowledge.
4. `lookup_student_by_roll_no` — queries the University MySQL DB for student records, roll slips, and exams.
5. `lookup_fee_by_reference` — queries the University MySQL DB for bank slips and fee status.
6. `lookup_faculty_info` — queries the University MySQL DB for teacher/professor details and contact info.

**NEVER call any tool for:**
- Greetings ("hello", "hi", "assalam", "shukriya", "thanks", "ok", "great", "nice")
- Casual reactions ("oh", "wow", "interesting", "i see", "good", "perfect", short acknowledgments)
- Responses that are already answered by the context below

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
8. **NEVER bold, italicize, or wrap the widget token in any extra characters.** Output it exactly as `[WIDGET:type:params]`.
9. **NEVER mention or describe the widget** in your response text.

### Verification flow:
- If student asks HOW to verify → explain the process and say "Please share your reference number / roll number and I'll look it up instantly from the university database."
- If student PROVIDES a number → Use the `lookup_student_by_roll_no` or `lookup_fee_by_reference` tool to fetch real data from the MySQL database, then output the matching widget.
- If student asks about teachers/professors → Use `lookup_faculty_info` to get their details.

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
7. **LANGUAGE (CRITICAL):** ALWAYS reply in ENGLISH. Even if the user speaks Urdu, Pashto, or any other language, you must respond only in English. Do NOT use any other language in your response.

Context from University Knowledge Base:
{context}
"""

        global QA_CHAIN_PROMPT
        QA_CHAIN_PROMPT = template

        # ── Create Agent (Model 2 is the agent executor) ──────────────────────
        tools = [fast_scrape_university_news, deep_scrape_with_playwright, search_wikipedia_topic]
        agent_executor = create_agent(model=llm_global, tools=tools, system_prompt=template)

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        def get_datetime(_):
            now = datetime.now()
            return now.strftime("%A, %B %d, %Y at %I:%M %p")

        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", template),
            ("human", "{question}")
        ])

        qa_chain = (
            {
                "context": (lambda x: x["question"]) | retriever_global | format_docs,
                "question": lambda x: x["question"],
                "current_datetime": RunnableLambda(get_datetime)
            }
            | qa_prompt
            | llm_global
            | StrOutputParser()
        )
        print("Pinecone & Groq Dual-Model Agent Pipeline initialized successfully.")
    except Exception as e:
        print(f"Error initializing RAG: {e}")


# ── Planner Prompt (Model 1) ──────────────────────────────────────────────────
PLANNER_PROMPT = """You are a smart query analyzer for a university chatbot assistant.

Analyze the user's question and the retrieved context, then produce a **structured markdown plan** for the final answering model.

Use this exact format:

**🎯 Intent:** One sentence describing what the user wants.

**📋 Key Facts from Context:**
- List the most relevant facts from the context (2-4 bullets)

**🔍 Gaps / Needs Web Search:**
- Any missing info that may require a live tool (or "None — context is sufficient")

**🌐 Response Language:** English / Urdu / Pashto (based on how the user wrote their question)

**✅ Answer Plan:** What the final response should cover in 1-2 sentences.

---
User Question: {query}

Retrieved Context:
{context}

Your structured analysis:"""


async def stream_planner(query: str, context: str):
    """
    Model 1: Planner — streams tokens one by one using thinking_token events.
    Uses the fast llama-3.1-8b-instant model.
    Yields: {"type": "thinking_token", "token": "..."}
    """
    if planner_llm is None:
        return
    try:
        prompt = PLANNER_PROMPT.format(query=query, context=context[:2000])
        from langchain_core.messages import HumanMessage
        async for chunk in planner_llm.astream([HumanMessage(content=prompt)]):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                yield {"type": "thinking_token", "token": token}
    except Exception as e:
        print(f"[Planner] Stream error: {e}")


async def fetch_all_context(query: str, pinecone_text: str) -> str:
    """Fetch optional live context in parallel with strict time limits."""
    parts = [pinecone_text]

    q = (query or "").lower()
    needs_live = any(k in q for k in ["latest", "today", "news", "announcement", "recent", "update"])
    needs_wiki = any(k in q for k in ["wikipedia", "history", "swat", "pakistan", "kpk"])

    tasks = []
    if needs_wiki:
        tasks.append(asyncio.create_task(asyncio.wait_for(get_wiki_context(query), timeout=3.5)))
    if needs_live:
        tasks.append(asyncio.create_task(asyncio.wait_for(get_live_context(), timeout=3.5)))

    wiki_res = ""
    live_res = ""
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        idx = 0
        if needs_wiki:
            wiki_res = results[idx] if not isinstance(results[idx], Exception) else ""
            idx += 1
        if needs_live:
            live_res = results[idx] if not isinstance(results[idx], Exception) else ""

    if live_res:
        parts.append(live_res)
    if wiki_res:
        parts.append("\n--- Wikipedia Context (Live) ---\n" + wiki_res)
        
    return "\n\n".join(filter(None, parts))


async def query_rag(query: str) -> str:
    if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY or llm_global is None:
        reason = "Missing API keys" if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY else "RAG initialization failed (check server logs for Pinecone/Groq errors)"
        return f"⚠️ **AI Unavailable**: {reason}. I am running in offline mode."
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from datetime import datetime

        pinecone_docs_list = retriever_global.invoke(query)
        pinecone_text = "\n\n".join(d.page_content for d in pinecone_docs_list)
        full_context = await fetch_all_context(query, pinecone_text)

        current_datetime = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
        system_prompt = QA_CHAIN_PROMPT.format(
            context=full_context,
            current_datetime=current_datetime
        )
        response = await llm_global.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ])
        return response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        return f"Error processing query: {str(e)}"


def is_complex_query(query: str) -> bool:
    """
    Heuristic: decide whether a query is complex enough to warrant
    running Model 1 (the planner / thinking step).
    """
    q = query.strip().lower()

    # Skip for very short or direct lookup queries
    if len(q) < 20:
        return False

    # Direct verification / lookup — no deep thinking needed
    simple_patterns = [
        'verify', 'roll no', 'roll number', 'bank slip', 'reference no',
        'phone', 'address', 'location', 'where is', 'contact',
        'hello', 'hi ', 'thanks', 'thank you', 'shukriya', 'assalam',
        'who is vc', 'who is vice chancellor',
    ]
    if any(p in q for p in simple_patterns):
        return False

    # Complex indicators — multi-part, analytical, or comparative
    complex_patterns = [
        'how', 'why', 'explain', 'compare', 'difference', 'which is better',
        'tell me about', 'what are the', 'requirements', 'eligibility',
        'scholarship', 'process', 'procedure', 'step', 'guide', 'apply',
        'fee structure', 'hostel', 'admission', 'research',
    ]
    if any(p in q for p in complex_patterns):
        return True

    # Long queries are probably complex
    if len(q) > 100:
        return True

    return False


def should_use_agent_tools(query: str) -> bool:
    """
    Use the tool-capable agent only when the prompt explicitly needs live/external data.
    This avoids agent/tool orchestration latency for normal university Q&A.
    """
    q = (query or "").lower()
    tool_intent_keywords = [
        "latest", "today", "news", "announcement", "recent", "update",
        "wikipedia", "wiki", "open website", "from website", "live web",
    ]
    return any(k in q for k in tool_intent_keywords)


async def query_rag_stream(query: str, history: list = None, thinking_enabled: bool = True) -> AsyncGenerator[dict, None]:
    """
    Streaming version of query_rag with Performance Optimizations:
    1. Fast Path: Bypasses thinking/agent for simple queries.
    2. Parallel Execution: Thinking and Fetching run concurrently.
    """
    if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY or agent_executor is None:
        reason = "Missing API keys" if not settings.GROQ_API_KEY or not settings.PINECONE_API_KEY else "RAG initialization failed (check terminal logs for connection errors)"
        msg = f"⚠️ **AI Mode Unavailable**: {reason}. Please check your internet connection and .env file."
        for word in msg.split():
            yield {"type": "token", "token": word + " "}
        return

    try:
        # ── FAST PATH: Instant response for simple queries ────────────────────
        is_complex = is_complex_query(query)
        if not is_complex:
            # Use qa_chain directly for speed (single-shot RAG)
            async for chunk in qa_chain.astream({"question": query}):
                if chunk:
                    yield {"type": "token", "token": chunk}
            return

        # ── COMPLEX PATH: Parallel Thinking & Fetching ────────────────────────
        # 1. Start fetching context from Pinecone (fast)
        pinecone_docs_list = retriever_global.invoke(query)
        pinecone_text = "\n\n".join(d.page_content for d in pinecone_docs_list)

        # 2. Start Thinking and Fetching in Parallel
        fetch_task = asyncio.create_task(fetch_all_context(query, pinecone_text))
        
        thinking_content = ""
        should_think = thinking_enabled and is_complex
        
        if should_think:
            # Keep the "thinking" UX, but cap planner runtime to avoid delaying final answers.
            planner_gen = stream_planner(query, pinecone_text[:1500])
            loop = asyncio.get_running_loop()
            deadline = loop.time() + 1.8

            while True:
                remaining = deadline - loop.time()
                if remaining <= 0:
                    break
                try:
                    evt = await asyncio.wait_for(planner_gen.__anext__(), timeout=remaining)
                except StopAsyncIteration:
                    break
                except asyncio.TimeoutError:
                    break

                thinking_content += evt.get("token", "")
                yield evt

            try:
                await planner_gen.aclose()
            except Exception:
                pass

        # 3. Wait for context to finish (if not already done)
        full_context = await fetch_task
        
        enriched_context = full_context
        if thinking_content:
            enriched_context = (
                full_context +
                "\n\n--- Planner Analysis ---\n" +
                thinking_content
            )

        current_datetime = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p (Pakistan Standard Time)")

        # ── Step 4: Build message history for final responder ─────────────────
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
        messages = []

        full_system_prompt = QA_CHAIN_PROMPT.format(
            context=enriched_context,
            current_datetime=current_datetime
        )
        messages.append(SystemMessage(content=full_system_prompt))

        if history:
            # Keep just recent context to reduce prompt size/latency
            for msg in history[-2:]:
                if msg.get("role") == "user":
                    messages.append(HumanMessage(content=msg.get("content", "")[:300]))
                else:
                    messages.append(AIMessage(content=msg.get("content", "")[:300]))

        messages.append(HumanMessage(content=query))

        # ── Step 5: Choose fastest responder path ─────────────────────────────
        use_agent = should_use_agent_tools(query)

        # Fast default path: direct LLM stream (no agent/tool orchestration)
        if not use_agent:
            async for chunk in llm_global.astream(messages):
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token:
                    yield {"type": "token", "token": token}
            return

        # Tool path: agent stream (only when query likely needs tools/live data)
        active_tools: set = set()
        try:
            async for event_msg, metadata in agent_executor.astream(
                {"messages": messages},
                stream_mode="messages"
            ):
                # ── Detect tool calls (tool_start) ────────────────────────────
                if hasattr(event_msg, "tool_calls") and event_msg.tool_calls:
                    for tc in event_msg.tool_calls:
                        tool_name = tc.get("name", "") if isinstance(tc, dict) else getattr(tc, "name", "")
                        if tool_name and tool_name not in active_tools:
                            active_tools.add(tool_name)
                            display = get_tool_display(tool_name)
                            yield {
                                "type": "tool_start",
                                "tool": tool_name,
                                "label": display["label"],
                                "icon": display["icon"],
                            }

                # ── Detect tool results (tool_end) ────────────────────────────
                msg_type = type(event_msg).__name__
                if msg_type == "ToolMessage":
                    tool_name = getattr(event_msg, "name", "") or ""
                    if tool_name in active_tools:
                        active_tools.discard(tool_name)
                        yield {"type": "tool_end", "tool": tool_name}

                if hasattr(event_msg, "content") and event_msg.content:
                    if msg_type not in ("ToolMessage", "SystemMessage"):
                        if not (hasattr(event_msg, "tool_calls") and event_msg.tool_calls and not event_msg.content.strip()):

                            import re as _re
                            clean = _re.sub(
                                r'</?(?:function_calls?|invoke|tool_use|tool_result|function|call|step)[^>]*>|/[a-z_]+</function>|<[a-z_]+(?:\s+[a-z_]+="[^"]*")*\s*/?>',
                                '', event_msg.content, flags=_re.IGNORECASE
                            )
                            if clean:
                                yield {"type": "token", "token": clean}

        except Exception as e:
            error_str = str(e)

            # ── Rate limit (429) — friendly message ───────────────────────────
            if "rate_limit_exceeded" in error_str or "429" in error_str:
                # Try to extract wait time from the error message
                import re
                wait_match = re.search(r'try again in (\d+m[\d.]+s|[\d.]+s)', error_str)
                wait_str = wait_match.group(1) if wait_match else "a few minutes"
                yield {
                    "type": "error",
                    "message": (
                        f"⚠️ **AI Rate Limit Reached**\n\n"
                        f"The AI model has reached its daily token limit. "
                        f"Please try again in **{wait_str}**.\n\n"
                        f"*Tip: This is a free-tier Groq limit (100K tokens/day). "
                        f"Upgrade at [console.groq.com](https://console.groq.com/settings/billing) for more.*"
                    )
                }

            # ── Bad tool call — fall back to direct LLM ───────────────────────
            elif ("failed_generation" in error_str
                    or "not in request.tools" in error_str
                    or "validation failed" in error_str):
                try:
                    fallback_llm = planner_llm if planner_llm else llm_global
                    fallback_response = await fallback_llm.ainvoke(messages)
                    if fallback_response and fallback_response.content:
                        yield {"type": "token", "token": fallback_response.content}
                except Exception as fb_e:
                    fb_err = str(fb_e)
                    if "rate_limit_exceeded" in fb_err or "429" in fb_err:
                        yield {"type": "error", "message": " Rate limit reached on all models. Please wait a few minutes and try again."}
                    else:
                        yield {"type": "error", "message": "I encountered an issue. Please try rephrasing your question."}
            else:
                yield {"type": "error", "message": f"Agent error: {error_str}"}

    except Exception as e:
        yield {"type": "error", "message": f"Error processing query: {str(e)}"}


init_rag()
