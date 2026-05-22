from __future__ import annotations

import csv
import tempfile
from pathlib import Path

import openpyxl
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from agents.agent1.config import Settings
from agents.agent1.models import AnalyzeResponse, UploadIdeasResponse
from agents.agent1.service import GeminiService

_ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
_MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

app = FastAPI(
    title="Agent Service 1 — Idea Evaluator",
    version="0.1.0",
    description="Reads idea spreadsheets and scores each idea via Gemini.",
)

settings = Settings.from_env()
service = GeminiService(settings)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "agent1-idea-evaluator",
        "gemini_configured": bool(settings.gemini_api_key),
        "gemini_model": settings.gemini_model,
    }


@app.post("/upload-ideas", response_model=UploadIdeasResponse)
async def upload_ideas(excel: UploadFile) -> UploadIdeasResponse:
    """Extract rows from an uploaded spreadsheet without calling the LLM."""
    tmp_path = await _save_upload(excel)
    try:
        ideas = _read_spreadsheet(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    return UploadIdeasResponse(
        message="Ideas extracted successfully",
        count=len(ideas),
        ideas=ideas,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(excel: UploadFile) -> AnalyzeResponse:
    """Upload a spreadsheet, score all ideas via Gemini, return full analysis."""
    tmp_path = await _save_upload(excel)
    try:
        ideas = _read_spreadsheet(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    try:
        analysis = await service.analyze_ideas(ideas)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AnalyzeResponse(total_ideas=len(ideas), analysis=analysis)


@app.post("/analyze-local", response_model=AnalyzeResponse)
async def analyze_local() -> AnalyzeResponse:
    """Analyze the committed uploads/ideas.csv without a file upload."""
    local_csv = Path(__file__).parent / "uploads" / "ideas.csv"
    if not local_csv.exists():
        raise HTTPException(status_code=404, detail="uploads/ideas.csv not found.")

    ideas = _read_spreadsheet(local_csv)

    try:
        analysis = await service.analyze_ideas(ideas)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return AnalyzeResponse(total_ideas=len(ideas), analysis=analysis)


async def _save_upload(file: UploadFile) -> Path:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        return Path(tmp.name)


def _read_spreadsheet(path: Path) -> list[dict]:
    ext = path.suffix.lower()
    if ext == ".csv":
        with open(path, newline="", encoding="utf-8-sig") as f:
            return [dict(row) for row in csv.DictReader(f)]

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not rows:
        return []

    headers = [str(h) if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
    return [
        {h: v for h, v in zip(headers, row)}
        for row in rows[1:]
        if any(v is not None for v in row)
    ]
