import sys
import os
sys.path.append(os.getcwd())
from app.core.config import settings

print(f"GROQ_API_KEY: {'[SET]' if settings.GROQ_API_KEY else '[EMPTY]'}")
print(f"PINECONE_API_KEY: {'[SET]' if settings.PINECONE_API_KEY else '[EMPTY]'}")
print(f"PINECONE_INDEX_NAME: {settings.PINECONE_INDEX_NAME}")
