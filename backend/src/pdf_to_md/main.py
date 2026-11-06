import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pdf_to_md.api.routes import router
from pdf_to_md.config import get_settings

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())

app = FastAPI(title="pdfToMd")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(router)
