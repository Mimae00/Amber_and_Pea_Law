"""Indexes this folder's markdown files into the AI service's ChromaDB collection.

Run with the AI service's virtualenv (from the repo root):
    ai-service\\.venv\\Scripts\\python knowledge-base\\ingest.py [--dry-run]

Configuration (embedding provider, Chroma mode/path) comes from ai-service/.env.
"""

from __future__ import annotations

import sys
from pathlib import Path

AI_SERVICE_DIR = Path(__file__).resolve().parent.parent / "ai-service"
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.ingest import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
