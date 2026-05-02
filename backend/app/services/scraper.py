"""
Live web scraper for University of Swat website.
Fetches news, events, and notices from the official site.
Results are cached in memory for 30 minutes.
Converted to ASYNC to prevent blocking the event loop.
"""
import time
import httpx
from bs4 import BeautifulSoup

_cache = {"data": None, "ts": 0}
CACHE_TTL = 1800  # 30 minutes
BASE_URL = "https://www.uswat.edu.pk"

async def _get(url: str, timeout: int = 6) -> BeautifulSoup | None:
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, timeout=timeout, headers={
                "User-Agent": "Mozilla/5.0 (compatible; UoS-Assistant/1.0)"
            })
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
    except Exception:
        return None

async def scrape_uos() -> dict:
    """Return a dict with news, events, notices scraped from UoS website."""
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    result = {"news": [], "notices": [], "events": [], "scraped_at": ""}

    soup = await _get(BASE_URL)
    if soup:
        # Try to pull news/announcement items
        for tag in soup.select("article, .news-item, .announcement, .post, .entry"):
            title_el = tag.find(["h2", "h3", "h4", "a"])
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            link_el = tag.find("a", href=True)
            link = link_el["href"] if link_el else ""
            if link and not link.startswith("http"):
                link = BASE_URL + link
            date_el = tag.find(["time", ".date", "span"])
            date = date_el.get_text(strip=True) if date_el else ""
            if title and len(title) > 5:
                result["news"].append({"title": title[:150], "link": link, "date": date})

    result["scraped_at"] = time.strftime("%Y-%m-%d %H:%M")
    result["news"] = result["news"][:8]

    _cache["data"] = result
    _cache["ts"] = now
    return result

async def get_live_context() -> str:
    """Return a formatted string suitable for injection into the LLM context."""
    try:
        data = await scrape_uos()
        if not data["news"]:
            return ""
        lines = ["## Live News & Announcements from uswat.edu.pk"]
        for item in data["news"]:
            date_str = f" ({item['date']})" if item["date"] else ""
            lines.append(f"- {item['title']}{date_str}")
        return "\n".join(lines)
    except Exception:
        return ""
