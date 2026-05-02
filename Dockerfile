# --- Stage 1: Build the React Frontend ---
FROM node:20-slim AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Setup the Python Backend ---
FROM python:3.10-slim

# Install system dependencies (needed for Playwright)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with user ID 1000 (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Install Playwright dependencies (requires root)
RUN pip install --no-cache-dir playwright
RUN playwright install-deps

USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy backend requirements and install
COPY --chown=user backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (in the user's home directory)
RUN playwright install chromium

# Copy the rest of the backend
COPY --chown=user backend/ ./backend/

# Copy the built frontend from Stage 1 to the location expected by FastAPI
COPY --chown=user --from=build-frontend /app/frontend/dist ./frontend/dist

# Set environment variables
ENV PYTHONPATH=$HOME/app/backend
ENV PORT=7860

# Expose the port Hugging Face Spaces uses
EXPOSE 7860

# Command to run the application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
