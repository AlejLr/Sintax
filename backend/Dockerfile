FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install CPU-only torch before the rest so pip doesn't pull multi-GB CUDA packages.
# torch from PyPI now bundles CUDA libs on Linux; the whl/cpu index avoids that.
RUN pip install --no-cache-dir torch \
      --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download es_dep_news_trf

COPY . .

EXPOSE 8000
# Single worker: transformer model holds ~2 GB RAM per process.
# Scale horizontally via Cloud Run instances, not uvicorn workers.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
