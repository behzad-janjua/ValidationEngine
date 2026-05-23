#!/usr/bin/env python3
"""
Run everything: serve the UI static files and mount Agent 1 API under /api.

Usage:
    python run_all.py

This starts a FastAPI server on http://127.0.0.1:8000
- UI served at / (index.html available at /index.html)
- Agent 1 endpoints mounted under /api (e.g. /api/analyze-local)
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from agents.agent1 import api as agent1_api
from agents.agent2 import main as agent2_main
from agents.agent3 import main as agent3_main


def create_app():
    app = FastAPI()

    # Allow cross-origin requests for development convenience
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount agent1 app at /api
    app.mount("/api", agent1_api.app)

    # Mount agent2 app at /agent2
    app.mount("/agent2", agent2_main.app)

    # Mount agent3 app at /agent3
    app.mount("/agent3", agent3_main.app)

    # Serve React build from frontend/dist (run: cd frontend && npm run build)
    ui_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")

    return app


app = create_app()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
