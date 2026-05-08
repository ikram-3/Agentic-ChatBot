import sys
import os
sys.path.append(os.getcwd())
from app.core.config import settings

import asyncio
from app.services.db_service import get_db_connection

async def main():
    print("🔍 --- UoS Chatbot Environment Check ---")
    print(f"GROQ_API_KEY:      {'[SET] ✅' if settings.GROQ_API_KEY else '[EMPTY] ❌'}")
    print(f"PINECONE_API_KEY:  {'[SET] ✅' if settings.PINECONE_API_KEY else '[EMPTY] ❌'}")
    print(f"PINECONE_INDEX:    {settings.PINECONE_INDEX_NAME}")
    
    print("\n🗄️ --- Database Connection Test ---")
    try:
        conn, db_type = await get_db_connection()
        print(f"Active DB Type:    {db_type.upper()}")
        
        if db_type == "mysql":
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                print("MySQL Status:      CONNECTED ✅")
            conn.close()
        else:
            async with conn.execute("SELECT 1"):
                print("SQLite Status:     CONNECTED ✅ (MySQL Failed/Fallback)")
            await conn.close()
    except Exception as e:
        print(f"Connection Status: FAILED ❌ ({e})")

if __name__ == "__main__":
    asyncio.run(main())
