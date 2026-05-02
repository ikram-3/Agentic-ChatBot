---
title: Agentic ChatBot
emoji: 🤖
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# University of Swat AI-Powered Web Application

This is a complete AI-powered web application for the University of Swat, featuring a React frontend and a FastAPI backend with a RAG (Retrieval-Augmented Generation) pipeline.

## 🏗️ Architecture

```
[User/Student] --> (React Frontend) 
                        |
                        v
                (FastAPI Backend) <--> (Pinecone Vector DB)
                        |                      ^
                        v                      |
                 (Groq LLM)           (JSON/PDF Data Ingestion)
```

## 📂 Folder Structure

- `backend/`: FastAPI Python backend. Contains the API routes and the RAG logic.
- `frontend/`: React (Vite) frontend application. Contains the UI components and styling.

## 🚀 Setup & Run Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- Groq API Key
- Pinecone API Key
- Google Maps API Key (Optional, for the Maps component)

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Environment Variables:
   - Copy the `.env` file or open it.
   - Add your Groq API key to `GROQ_API_KEY=your_key_here`.
   - Add your Pinecone API key to `PINECONE_API_KEY=your_key_here`.
5. Run the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be running at `http://localhost:8000`. You can test the API endpoints at `http://localhost:8000/docs`.

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - Create a `.env` file in the `frontend` root directory.
   - Add your Google Maps API key (if you have one): `VITE_GOOGLE_MAPS_API_KEY=your_key_here`.
4. Run the React development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at the URL shown in the terminal (usually `http://localhost:5173`).

## 🧠 RAG Implementation Details

- **Data Source**: Currently uses a sample `uos_data.json` containing mock data about programs, fees, and admissions.
- **Embeddings**: Uses Pinecone's Serverless Inference API (`multilingual-e5-large`) to generate embeddings (1024-dimensional) via the cloud, requiring no heavy local ML libraries to install.
- **Vector Store**: Uses `Pinecone` to store and query the document embeddings efficiently in the cloud.
- **LLM**: Uses `llama3-8b-8192` via Groq Cloud and Langchain's `RetrievalQA` chain. A custom system prompt restricts the model to only answer questions based on the provided context, preventing hallucination.
