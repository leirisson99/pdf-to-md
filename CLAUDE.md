# CLAUDE.md

Guia para o Claude (e para devs) trabalharem neste repositório.

## Visão geral

**pdfToMd** converte arquivos PDF em Markdown. Fluxo único e simples:

1. Usuário envia um PDF pelo frontend.
2. Backend converte usando a engine escolhida.
3. Usuário baixa o `.md` gerado.

Sem login, sem banco de dados, sem armazenamento persistente. Arquivos são processados em diretório temporário e apagados ao fim da requisição.

## Stack

| Camada   | Tecnologia                                  |
|----------|---------------------------------------------|
| Backend  | Python 3.12+, FastAPI, uv                   |
| Engines  | `pymupdf4llm` (fast), `docling` (accurate)  |
| Frontend | Next.js (App Router), TypeScript, Tailwind  |
| Testes   | pytest (backend), Vitest (frontend)         |

## Estrutura

```
pdfToMd/
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── src/pdf_to_md/
│   │   ├── main.py              # app FastAPI, CORS, routers
│   │   ├── config.py            # settings (pydantic-settings, lê .env)
│   │   ├── api/
│   │   │   └── routes.py        # /health, /api/convert
│   │   └── converters/
│   │       ├── base.py          # Protocol Converter
│   │       ├── pymupdf.py       # engine "fast"
│   │       ├── docling.py       # engine "accurate"
│   │       └── factory.py       # get_converter(engine)
│   └── tests/
└── frontend/
    ├── package.json
    ├── app/
    │   ├── page.tsx             # tela de upload
    │   └── layout.tsx
    ├── components/
    │   ├── UploadForm.tsx
    │   └── EngineSelector.tsx
    └── lib/
        └── api.ts               # chamada ao backend
```

## Comandos

### Backend (rodar dentro de `backend/`)

```bash
uv sync                                          # instala dependências
uv run fastapi dev src/pdf_to_md/main.py         # dev server em :8000
uv run pytest                                    # testes
uv run ruff check . && uv run ruff format .      # lint + format
uv add <pacote>                                  # nova dependência
```

Nunca use `pip install` diretamente. Toda dependência passa por `uv add`.

### Frontend (rodar dentro de `frontend/`)

```bash
npm install
npm run dev      # :3000
npm run lint
npm run test
```

## Contrato da API

### `GET /health`
Retorna `{"status": "ok"}`.

### `POST /api/convert`
- **Body:** `multipart/form-data`
  - `file`: PDF (obrigatório)
  - `engine`: `"fast"` | `"accurate"` (opcional, padrão `"fast"`)
- **200:** corpo `text/markdown; charset=utf-8` com header
  `Content-Disposition: attachment; filename="<nome-original>.md"`
- **400:** arquivo ausente, não é PDF ou engine inválida
- **413:** arquivo maior que `MAX_FILE_SIZE_MB`
- **500:** falha na conversão (mensagem genérica; detalhe só no log)

Erros seguem o formato `{"detail": "mensagem"}`.

## Regras de implementação

### Backend
- Toda engine implementa o mesmo `Protocol`:
  ```python
  class Converter(Protocol):
      def convert(self, pdf_path: Path) -> str: ...
  ```
  A rota não conhece a biblioteca. Ela só chama `get_converter(engine).convert(path)`.
- Conversão é CPU-bound e síncrona: execute com `run_in_threadpool` (ou `asyncio.to_thread`) para não travar o event loop.
- Validar PDF pelos **magic bytes** (`%PDF-`), não só pela extensão ou content-type.
- Validar tamanho antes de converter.
- Usar `tempfile.TemporaryDirectory()` e garantir limpeza mesmo em erro.
- Instanciar o `DocumentConverter` do Docling **uma vez** (é caro) e reutilizar. Ele baixa modelos na primeira execução.
- Type hints em tudo. Ruff como lint/format.
- Logs com `logging`, nunca `print`.

### Frontend
- Componentes funcionais com TypeScript estrito.
- URL do backend via `NEXT_PUBLIC_API_URL`.
- Download feito a partir do `Blob` da resposta (`URL.createObjectURL`), respeitando o filename do header.
- Estados de UI obrigatórios: idle, enviando/convertendo, sucesso, erro.
- Validar extensão e tamanho no cliente também, mas o backend é a fonte da verdade.

## Variáveis de ambiente

`backend/.env`
```
MAX_FILE_SIZE_MB=20
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

`frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testes
- Fixtures de PDF pequenos em `backend/tests/fixtures/`.
- Testar cada converter isoladamente e a rota com `TestClient`.
- Casos mínimos: PDF válido (cada engine), arquivo não-PDF, arquivo grande demais, engine inválida.
- Testes do Docling podem ser marcados com `@pytest.mark.slow`.

## Atenção
- **Licença:** `pymupdf4llm`/PyMuPDF é AGPL-3.0. Uso comercial fechado exige licença da Artifex ou trocar a engine "fast". Docling é MIT.
- Não persistir arquivos de usuários em disco além da requisição.
- Não commitar `.env`, PDFs de teste grandes ou modelos baixados.

## Fora de escopo (por enquanto)
Autenticação, histórico de conversões, fila assíncrona, processamento em lote, outros formatos além de PDF.