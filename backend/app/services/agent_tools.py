"""
Agent Tools for UoS Assistant.
These tools are exposed to the LangChain Agent to fetch real-time information.
"""

from langchain_core.tools import tool
from playwright.async_api import async_playwright
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_classic.chains import LLMMathChain
from langchain_core.tools import Tool



@tool
async def fast_scrape_university_news() -> str:
    """
    Use this tool FIRST when you need to know the latest news, announcements, or events 
    from the University of Swat website. It is very fast but only grabs headlines.
    """
    from app.services.scraper import get_live_context
    result = await get_live_context()
    if not result:
        return "No recent news found on the website."
    return result

@tool
async def deep_scrape_with_playwright(url: str) -> str:
    """
    Use this tool ONLY when you need to extract deep, detailed text from a specific URL 
    on the University of Swat website (e.g. reading a full admission policy page) and 
    the fast_scrape tool didn't have enough detail.
    It launches a headless browser to render JavaScript.
    Do NOT use this for general knowledge.
    """
    if not url.startswith("http"):
        url = "https://www.uswat.edu.pk/" + url.lstrip("/")
        
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=15000)
            
            # Extract main text content, excluding nav/footer clutter if possible
            content = await page.evaluate('''() => {
                const main = document.querySelector("main, article, .content-area") || document.body;
                return main.innerText;
            }''')
            await browser.close()
            
            # Truncate to avoid context window explosion
            return content[:3000] + "\n...(truncated)"
    except Exception as e:
        return f"Failed to deep scrape {url}. Error: {str(e)}"

@tool
async def search_wikipedia_topic(query: str) -> str:
    """
    Search Wikipedia for a specific topic when you need general knowledge 
    about Swat, history, geography, or academic terms not found in the 
    university's local database.
    """
    from app.services.wikipedia_service import fetch_summary
    result = await fetch_summary(query)
    if not result or not result.get("extract"):
        return f"No Wikipedia entry found for '{query}'."
    return f"Title: {result['title']}\nSummary: {result['extract']}\nSource: {result['url']}"

def get_all_tools(llm):
    """Returns a list of all tools available to the agent."""
    
    # 1. Fast Scraper
    fast_scraper = fast_scrape_university_news
    deep_scraper = deep_scrape_with_playwright
    
    # 2. Custom Wikipedia Search
    wiki_tool = search_wikipedia_topic
    
    # 3. Math Tool
    math_chain = LLMMathChain.from_llm(llm=llm)
    math_tool = Tool(
        name="Calculator",
        func=math_chain.run,
        coroutine=math_chain.arun,
        description="Useful for when you need to answer questions about math or calculations."
    )
    
    return [fast_scraper, deep_scraper, wiki_tool, math_tool]

