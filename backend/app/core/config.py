from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "University of Swat AI Assistant"
    GROQ_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "uos-assistant"
    GOOGLE_MAPS_API_KEY: str = ""
    
    # MySQL Settings
    MYSQL_HOST: str = "localhost"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "uos_chatbot"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
