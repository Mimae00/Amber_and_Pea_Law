# syntax=docker/dockerfile:1
# Amber & Pea Law AI service (FastAPI, hybrid RAG). The knowledge base is baked in so the
# same image can run the ingest job.
# Build from the repo root:  docker build -f ai-service/Dockerfile -t amberpea-ai .

# ---- Build: install pinned dependencies into a virtualenv ----
FROM python:3.13.16-slim-trixie AS build
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
COPY ai-service/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# ---- Runtime ----
FROM python:3.13.16-slim-trixie
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --create-home --home-dir /home/app app

COPY --from=build /opt/venv /opt/venv

# Same layout as the repo, so the default KNOWLEDGE_BASE_DIR (../knowledge-base) works unchanged.
WORKDIR /app/ai-service
COPY ai-service/app ./app
COPY knowledge-base /app/knowledge-base
RUN mkdir -p /app/ai-service/data && chown -R app:app /app/ai-service/data

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=8000

USER 10001:10001
EXPOSE 8000
# Embedded ChromaDB data (CHROMA_MODE=persistent). Not needed with CHROMA_MODE=http.
VOLUME ["/app/ai-service/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=2).status == 200 else 1)"]

# Serve:   docker run ... amberpea-ai
# Ingest:  docker run ... amberpea-ai python /app/knowledge-base/ingest.py
CMD ["python", "-m", "app.main"]
