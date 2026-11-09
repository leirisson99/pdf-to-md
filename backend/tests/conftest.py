import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

# Precisa vir antes de qualquer import de pdf_to_md: o banco dos testes é temporário.
_TEST_DB = Path(tempfile.mkdtemp(prefix="pdf_to_md_tests_")) / "history.db"
os.environ["DATABASE_PATH"] = str(_TEST_DB)


@pytest.fixture(autouse=True)
def clean_db() -> Iterator[None]:
    _TEST_DB.unlink(missing_ok=True)
    yield
    _TEST_DB.unlink(missing_ok=True)


@pytest.fixture
def sample_pdf() -> Path:
    return Path(__file__).parent / "fixtures" / "sample.pdf"
