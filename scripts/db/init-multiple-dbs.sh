#!/usr/bin/env bash
set -euo pipefail

echo "[init-db] Ensuring pgvector extension on 'rag_hr'."
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "rag_hr" \
    -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "[init-db] Database 'rag_hr' is ready."