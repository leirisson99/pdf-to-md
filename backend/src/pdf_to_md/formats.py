"""Detecção e validação dos formatos de entrada, pela extensão E pelo conteúdo."""

import io
import zipfile
from pathlib import Path

from PIL import Image, UnidentifiedImageError

IMAGE_EXTENSIONS: tuple[str, ...] = ("png", "jpg", "jpeg")
SUPPORTED_EXTENSIONS: tuple[str, ...] = ("pdf", "docx", "xlsx", "csv", "txt", *IMAGE_EXTENSIONS)
SUPPORTED_LABEL = "PDF, DOCX, XLSX, CSV, TXT, PNG ou JPG"

PDF_MAGIC = b"%PDF-"
# DOCX/XLSX são ZIPs: um arquivo pequeno pode expandir para gigabytes (zip bomb).
MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024
_ZIP_ROOT = {"docx": "word/", "xlsx": "xl/"}
# Imagens enormes em pixels podem ocupar gigabytes ao decodificar (decompression bomb).
MAX_IMAGE_PIXELS = 50_000_000
_IMAGE_MAGIC = {
    "png": b"\x89PNG\r\n\x1a\n",
    "jpg": b"\xff\xd8\xff",
    "jpeg": b"\xff\xd8\xff",
}


class InvalidFileError(ValueError):
    """Arquivo recusado; a mensagem é segura para mostrar ao usuário."""


def decode_text(content: bytes) -> str:
    """Decodifica texto em UTF-8, com fallback para cp1252 (comum em arquivos BR)."""
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise InvalidFileError("Não foi possível ler o texto do arquivo (codificação desconhecida).")


def _check_zip(content: bytes, ext: str) -> None:
    label = ext.upper()
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            infos = zf.infolist()
            names = [i.filename for i in infos]
            if "[Content_Types].xml" not in names or not any(
                n.startswith(_ZIP_ROOT[ext]) for n in names
            ):
                raise InvalidFileError(f"O arquivo não é um {label} válido.")
            if sum(i.file_size for i in infos) > MAX_UNCOMPRESSED_BYTES:
                raise InvalidFileError("O arquivo é grande demais depois de descompactado.")
    except zipfile.BadZipFile:
        raise InvalidFileError(f"O arquivo não é um {label} válido.") from None


def _check_image(content: bytes, ext: str) -> None:
    label = "PNG" if ext == "png" else "JPEG"
    if not content.startswith(_IMAGE_MAGIC[ext]):
        raise InvalidFileError(f"O arquivo não é uma imagem {label} válida.")
    try:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size  # lê só o cabeçalho
            if width * height > MAX_IMAGE_PIXELS:
                raise InvalidFileError("A imagem tem resolução alta demais.")
            img.verify()
    except InvalidFileError:
        raise
    except Image.DecompressionBombError:
        raise InvalidFileError("A imagem tem resolução alta demais.") from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise InvalidFileError(f"O arquivo não é uma imagem {label} válida.") from None


def validate_file(filename: str, content: bytes) -> str:
    """Valida o arquivo e devolve a extensão normalizada (sem ponto)."""
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in SUPPORTED_EXTENSIONS:
        raise InvalidFileError(f"Formato não suportado. Use {SUPPORTED_LABEL}.")

    if ext == "pdf":
        if not content.startswith(PDF_MAGIC):
            raise InvalidFileError("O arquivo não é um PDF válido.")
    elif ext in IMAGE_EXTENSIONS:
        _check_image(content, ext)
    elif ext in _ZIP_ROOT:
        _check_zip(content, ext)
    else:  # txt, csv
        if b"\x00" in content:
            raise InvalidFileError(f"O arquivo não é um {ext.upper()} válido.")
        decode_text(content)
    return ext
