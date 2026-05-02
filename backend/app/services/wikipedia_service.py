"""
Wikipedia Agentic Tool for UoS Assistant.
Fetches live summaries from Wikipedia for university-related topics.
Caches results for 2 hours to avoid hammering the API.
"""
import time
import requests

_cache: dict = {}
CACHE_TTL = 7200  # 2 hours

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


def fetch_summary(title: str) -> dict | None:
    """Fetch Wikipedia page summary for a given title."""
    cache_key = title.lower().strip()
    now = time.time()
    if cache_key in _cache and (now - _cache[cache_key]["ts"]) < CACHE_TTL:
        return _cache[cache_key]["data"]

    try:
        slug = title.strip().replace(" ", "_")
        resp = requests.get(WIKI_SUMMARY_URL.format(title=slug),
                            headers=HEADERS, timeout=6)
        
        # If 404, the title might be too specific. Try searching for it.
        if resp.status_code == 404:
            search_resp = requests.get(WIKI_SEARCH_URL, params={
                "action": "query", "list": "search", "srsearch": title,
                "srlimit": 1, "format": "json"
            }, headers=HEADERS, timeout=6)
            search_resp.raise_for_status()
            search_results = search_resp.json().get("query", {}).get("search", [])
            if search_results:
                return fetch_summary(search_results[0]["title"])
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


def search_wikipedia(query: str, limit: int = 3) -> list[dict]:
    """Search Wikipedia and return top matches."""
    try:
        resp = requests.get(WIKI_SEARCH_URL, params={
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": limit,
            "format": "json",
        }, headers=HEADERS, timeout=6)
        resp.raise_for_status()
        results = resp.json().get("query", {}).get("search", [])
        out = []
        for r in results:
            summary = fetch_summary(r["title"])
            if summary:
                out.append(summary)
        return out
    except Exception as e:
        print(f"[Wikipedia] Search failed for '{query}': {e}")
        return []


def get_wiki_context(query: str = "") -> str:
    """
    Return a formatted string of Wikipedia context suitable for LLM injection.
    Always includes the UoS article. If query is provided, also searches for it.
    """
    lines = []

    # Always include core articles
    for topic in SEED_TOPICS:
        info = fetch_summary(topic)
        if info and info.get("extract"):
            lines.append(f"## Wikipedia: {info['title']}")
            lines.append(info["extract"])
            if info.get("url"):
                lines.append(f"Source: {info['url']}")
            lines.append("")

    # If query looks like it needs additional wiki context, search
    if query and len(query) > 4:
        search_results = search_wikipedia(query, limit=1)
        for r in search_results:
            title_lower = r["title"].lower()
            # Skip if already covered by seed topics
            if any(t.lower() in title_lower or title_lower in t.lower()
                   for t in SEED_TOPICS):
                continue
            if r.get("extract"):
                lines.append(f"## Wikipedia: {r['title']}")
                lines.append(r["extract"])
                lines.append("")

    return "\n".join(lines).strip()
