# pdfToMd

> Convert PDF files into clean, structured Markdown — ready for docs, notes, and LLM/RAG pipelines.

Upload a PDF, pick a conversion engine, download the `.md`. That's it.

## Features

- **Two conversion engines**
  - **Fast**: [pymupdf4llm](https://github.com/pymupdf/RAG). Great for PDFs with selectable text.
  - **Accurate**: [Docling](https://github.com/docling-project/docling). Better for complex layouts, tables and scanned documents (OCR).
- Preserves headings, lists and tables
- No accounts, no storage: files are processed and discarded
- Simple web UI built with Next.js

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, [uv](https://docs.astral.sh/uv/)
- **Frontend:** Next.js, TypeScript, Tailwind CSS

## Getting Started

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 20+

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run fastapi dev src/pdf_to_md/main.py
```

API available at `http://localhost:8000` (interactive docs at `/docs`).

> The first conversion using the **accurate** engine downloads Docling's models and may take a while.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## API

### `POST /api/convert`

| Field    | Type   | Required | Description                         |
|----------|--------|----------|-------------------------------------|
| `file`   | file   | yes      | PDF file                            |
| `engine` | string | no       | `fast` (default) or `accurate`      |

Returns the Markdown file as a download (`text/markdown`).

```bash
curl -X POST http://localhost:8000/api/convert \
  -F "file=@document.pdf" \
  -F "engine=accurate" \
  -o document.md
```

### `GET /health`

Returns `{"status": "ok"}`.

## Project Structure

```
pdfToMd/
├── backend/     # FastAPI + conversion engines (uv)
└── frontend/    # Next.js web app
```

## Running Tests

```bash
# backend
cd backend && uv run pytest

# frontend
cd frontend && npm run test
```

## Roadmap

- [ ] Markdown preview before download
- [ ] Batch conversion
- [ ] Docker Compose setup
- [ ] Support for DOCX and other formats

## License

MIT. Note that the **fast** engine depends on PyMuPDF, which is licensed under **AGPL-3.0**. Check its terms before using this project in closed-source commercial software.