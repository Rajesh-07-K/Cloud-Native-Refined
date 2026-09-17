# AI Service

This microservice provides the AI agentic layer for the Document Workflow System.

## Setup

1. Install system dependencies for OCR:
   - **Ubuntu/Debian:** `sudo apt install tesseract-ocr poppler-utils`
   - **Windows:** 
     - Install Tesseract-OCR (https://github.com/UB-Mannheim/tesseract/wiki)
     - Install Poppler for Windows and add to PATH (https://github.com/oschwartz10612/poppler-windows/releases/)
2. Create and activate a Python virtual environment.
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in your Groq API key and paths.
5. Run the service:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
