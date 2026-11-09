import io
import logging
import tempfile
import zipfile
from dataclasses import asdict
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from pdf_to_md.config import get_settings
from pdf_to_md.converters.factory import VALID_ENGINES, get_converter, get_document_converter
from pdf_to_md.db import add_conversion, list_conversions
from pdf_to_md.formats import IMAGE_EXTENSIONS, InvalidFileError, decode_text, validate_file

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


async def _convert_file(content: bytes, ext: str, engine: str) -> str:
    converter = get_converter(engine) if ext == "pdf" else get_document_converter(ext)
    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / f"input.{ext}"
        path.write_bytes(content)
        return await run_in_threadpool(converter.convert, path)


async def _convert_pdf_pages(content: bytes, engine: str) -> list[str]:
    converter = get_converter(engine)
    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / "input.pdf"
        path.write_bytes(content)
        return await run_in_threadpool(converter.convert_pages, path)


def _zip_pages(stem: str, pages: list[str]) -> bytes:
    """Um .md por página; páginas em branco são puladas, mantendo a numeração."""
    width = max(3, len(str(len(pages))))
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for number, text in enumerate(pages, start=1):
            if text.strip():
                zf.writestr(f"{stem}_pagina_{number:0{width}d}.md", text)
    return buffer.getvalue()


@router.get("/api/history")
async def history(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
) -> dict[str, Any]:
    items, total = await run_in_threadpool(list_conversions, page, page_size)
    return {
        "items": [asdict(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/api/convert")
async def convert(
    file: Annotated[UploadFile | None, File()] = None,
    engine: Annotated[str, Form()] = "fast",
    split_pages: Annotated[bool, Form()] = False,
) -> Response:
    settings = get_settings()

    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo ausente.")
    if engine not in VALID_ENGINES:
        raise HTTPException(status_code=400, detail="Engine inválida.")

    # Lê no máximo limite + 1 byte para detectar excesso sem carregar tudo.
    content = await file.read(settings.max_file_size_bytes + 1)
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo maior que {settings.max_file_size_mb} MB.",
        )
    try:
        ext = validate_file(file.filename, content)
    except InvalidFileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None

    split = split_pages and ext == "pdf"  # nos demais formatos o campo é ignorado

    if split:
        try:
            pages = await _convert_pdf_pages(content, engine)
        except Exception:
            logger.exception("Falha ao converter PDF por páginas (engine=%s)", engine)
            raise HTTPException(status_code=500, detail="Falha na conversão do arquivo.") from None
        if not any(page.strip() for page in pages):
            raise HTTPException(status_code=422, detail="Nenhum conteúdo foi encontrado no PDF.")
        stem = Path(file.filename).stem
        zip_name = f"{stem}.zip"
        try:
            await run_in_threadpool(add_conversion, file.filename, zip_name, engine)
        except Exception:
            logger.exception("Falha ao registrar conversão no histórico")
        return Response(
            content=_zip_pages(stem, pages),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
        )

    try:
        if ext == "txt":
            # Texto puro: devolve como está (o Docling juntaria as linhas).
            markdown = decode_text(content)
        else:
            markdown = await _convert_file(content, ext, engine)
    except Exception:
        logger.exception("Falha ao converter arquivo (formato=%s, engine=%s)", ext, engine)
        raise HTTPException(status_code=500, detail="Falha na conversão do arquivo.") from None

    if ext in IMAGE_EXTENSIONS and not markdown.strip():
        raise HTTPException(status_code=422, detail="Nenhum texto foi reconhecido na imagem.")

    md_name = f"{Path(file.filename).stem}.md"
    # Engine realmente usada: só PDF respeita a escolha; TXT é leitura direta.
    used_engine = engine if ext == "pdf" else ("fast" if ext == "txt" else "accurate")

    # Histórico é secundário: falha ao gravar não impede o download.
    try:
        await run_in_threadpool(add_conversion, file.filename, md_name, used_engine)
    except Exception:
        logger.exception("Falha ao registrar conversão no histórico")

    return Response(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{md_name}"'},
    )
