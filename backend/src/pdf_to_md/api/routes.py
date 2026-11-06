import logging
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from pdf_to_md.config import get_settings
from pdf_to_md.converters.factory import VALID_ENGINES, get_converter

logger = logging.getLogger(__name__)
router = APIRouter()

PDF_MAGIC = b"%PDF-"


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/convert")
async def convert(
    file: Annotated[UploadFile | None, File()] = None,
    engine: Annotated[str, Form()] = "fast",
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
    if not content.startswith(PDF_MAGIC):
        raise HTTPException(status_code=400, detail="O arquivo não é um PDF válido.")

    converter = get_converter(engine)

    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = Path(tmp_dir) / "input.pdf"
        pdf_path.write_bytes(content)
        try:
            markdown = await run_in_threadpool(converter.convert, pdf_path)
        except Exception:
            logger.exception("Falha ao converter PDF (engine=%s)", engine)
            raise HTTPException(status_code=500, detail="Falha na conversão do arquivo.") from None

    md_name = f"{Path(file.filename).stem}.md"
    return Response(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{md_name}"'},
    )
