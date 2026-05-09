"""
Wikipedia Agentic Tool for UoS Assistant.
Fetches live summaries from Wikipedia for university-related topics.
Caches results for 2 hours to avoid hammering the API.
Converted to ASYNC for maximum performance.
"""
import time
import httpx

_cache: dict = {}
CACHE_TTL = 7200  

WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
WIKI_SEARCH_URL  = "https://en.wikipedia.org/w/api.php"

HEADERS = {
    "User-Agent": "UoS-AI-Assistant/1.0 (educational project; contact: info@uswat.edu.pk)"
}

# Pre-seeded topics always fetched at startup
SEED_TOPICS = [
    "University of Swat",
    "Swat District",
    "Khyber Pakhtunkhwa",
]

async def fetch_summary(title: str) -> dict | None:
    """Fetch Wikipedia page summary for a given title (Async)."""
    cache_key = title.lower().strip()
    now = time.time()
    if cache_key in _cache and (now - _cache[cache_key]["ts"]) < CACHE_TTL:
        return _cache[cache_key]["data"]

    try:
        slug = title.strip().replace(" ", "_")
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(WIKI_SUMMARY_URL.format(title=slug),
                                    headers=HEADERS, timeout=6)
            
            # If 404, try searching
            if resp.status_code == 404:
                search_resp = await client.get(WIKI_SEARCH_URL, params={
                    "action": "query", "list": "search", "srsearch": title,
                    "srlimit": 1, "format": "json"
                }, headers=HEADERS, timeout=6)
                search_resp.raise_for_status()
                search_results = search_resp.json().get("query", {}).get("search", [])
                if search_results:
                    return await fetch_summary(search_results[0]["title"])
                return None

            resp.raise_for_status()
            data = resp.json()
            result = {
                "title": data.get("title", title),
                "extract": data.get("extract", "")[:1200],
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }
            _cache[cache_key] = {"data": result, "ts": now}
            return result
    except Exception as e:
        print(f"[Wikipedia] Could not fetch '{title}': {e}")
        return None

import asyncio

async def search_wikipedia(query: str, limit: int = 3) -> list[dict]:
    """Search Wikipedia and return top matches (Async)."""
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(WIKI_SEARCH_URL, params={
                "action": "query", "list": "search", "srsearch": query,
                "srlimit": limit, "format": "json"
            }, headers=HEADERS, timeout=6)
            resp.raise_for_status()
            results = resp.json().get("query", {}).get("search", [])
            
            # Parallel fetch summaries for all search results
            tasks = [fetch_summary(r["title"]) for r in results]
            summaries = await asyncio.gather(*tasks)
            return [s for s in summaries if s]
    except Exception as e:
        print(f"[Wikipedia] Search failed for '{query}': {e}")
        return []

async def get_wiki_context(query: str = "") -> str:
    """
    Return a formatted string of Wikipedia context suitable for LLM injection.
    Always includes core articles + search results if query is complex.
    """
    # 1. Parallel fetch all seed topics
    seed_tasks = [fetch_summary(topic) for topic in SEED_TOPICS]
    
    # 2. Parallel fetch search results if query is provided
    search_task = None
    if query and len(query) > 4:
        search_task = search_wikipedia(query, limit=1)

    # Gather everything
    all_tasks = seed_tasks + ([search_task] if search_task else [])
    results = await asyncio.gather(*all_tasks)
    
    seed_results = results[:len(SEED_TOPICS)]
    extra_results = results[len(SEED_TOPICS)] if search_task else []

    lines = []
    
    # Process seed results
    for info in seed_results:
        if info and info.get("extract"):
            lines.append(f"## Wikipedia: {info['title']}")
            lines.append(info["extract"])
            if info.get("url"):
                lines.append(f"Source: {info['url']}")
            lines.append("")

    # Process search results
    for r in extra_results:
        title_lower = r["title"].lower()
        if any(t.lower() in title_lower or title_lower in t.lower() for t in SEED_TOPICS):
            continue
        if r.get("extract"):
            lines.append(f"## Wikipedia: {r['title']}")
            lines.append(r["extract"])
            lines.append("")

    return "\n".join(lines).strip()
