#!/usr/bin/env bash
# Idempotent multi-database init script for the rag Postgres+pgvector container.
#
# The official Postgres image runs every executable .sh under
# /docker-entrypoint-initdb.d/ exactly once, on first volume init, as the
# superuser. This script provisions additional databases beyond POSTGRES_DB
# (which the entrypoint itself creates) and enables the `vector` extension
# on each one so both v1.0 (`rag_hr`) and v2.0 (`spec_workbench`) schemas
# are ready immediately after `docker compose up`.
#
# Note: POSTGRES_DB (rag_hr) is created by the image entrypoint; do NOT
# attempt to create it here.

set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-rag}"

# Additional databases to ensure exist. Space-separated for portability.
# `rag_hr` is included so we can idempotently ensure the `vector` extension is
# enabled on it; the existence check below short-circuits the CREATE DATABASE
# step (the image entrypoint already created it from POSTGRES_DB).
ADDITIONAL_DBS="rag_hr"

create_db_if_missing() {
    db="$1"
    echo "[init-multiple-dbs] Checking database: ${db}"
    exists=$(psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '${db}'")
    if [ "${exists}" = "1" ]; then
        echo "[init-multiple-dbs] Database '${db}' already exists; skipping CREATE."
    else
        echo "[init-multiple-dbs] Creating database '${db}' owned by '${POSTGRES_USER}'."
        psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres \
            -c "CREATE DATABASE \"${db}\" OWNER \"${POSTGRES_USER}\""
    fi

    echo "[init-multiple-dbs] Ensuring pgvector extension on '${db}'."
    psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${db}" \
        -c "CREATE EXTENSION IF NOT EXISTS vector;"
}

for db in ${ADDITIONAL_DBS}; do
    create_db_if_missing "${db}"
done

echo "[init-multiple-dbs] Done. Provisioned: ${ADDITIONAL_DBS}"
