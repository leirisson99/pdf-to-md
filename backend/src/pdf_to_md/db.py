"""Histórico de conversões em SQLite (apenas metadados, nunca o conteúdo dos arquivos)."""

import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from pdf_to_md.config import get_settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    output_filename TEXT NOT NULL,
    engine TEXT NOT NULL,
    created_at TEXT NOT NULL
)
"""


@dataclass(frozen=True)
class ConversionRecord:
    id: int
    filename: str
    output_filename: str
    engine: str
    created_at: str


def _connect() -> sqlite3.Connection:
    path = Path(get_settings().database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with closing(_connect()) as conn, conn:
        conn.execute(_SCHEMA)


def add_conversion(filename: str, output_filename: str, engine: str) -> None:
    created_at = datetime.now(UTC).isoformat()
    with closing(_connect()) as conn, conn:
        conn.execute(_SCHEMA)
        conn.execute(
            "INSERT INTO conversions (filename, output_filename, engine, created_at)"
            " VALUES (?, ?, ?, ?)",
            (filename, output_filename, engine, created_at),
        )


def list_conversions(page: int, page_size: int) -> tuple[list[ConversionRecord], int]:
    """Retorna (itens da página, total), do mais recente para o mais antigo."""
    offset = (page - 1) * page_size
    with closing(_connect()) as conn:
        conn.execute(_SCHEMA)
        total: int = conn.execute("SELECT COUNT(*) FROM conversions").fetchone()[0]
        rows = conn.execute(
            "SELECT id, filename, output_filename, engine, created_at FROM conversions"
            " ORDER BY id DESC LIMIT ? OFFSET ?",
            (page_size, offset),
        ).fetchall()
    return [ConversionRecord(**dict(row)) for row in rows], total
