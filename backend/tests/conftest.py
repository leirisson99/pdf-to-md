from pathlib import Path

import pytest


@pytest.fixture
def sample_pdf() -> Path:
    return Path(__file__).parent / "fixtures" / "sample.pdf"
