#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[entrypoint] $*"
}

PG_MAJOR="$(ls -1 /usr/lib/postgresql | sort -V | tail -n 1)"
PG_BINDIR="/usr/lib/postgresql/${PG_MAJOR}/bin"
export PATH="${PG_BINDIR}:${PATH}"

POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-/var/lib/postgresql/data}"
POSTGRES_USER="${POSTGRES_USER:-pca_app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pca_app_password}"
POSTGRES_DB="${POSTGRES_DB:-pca_hijab}"
PORT="${PORT:-5001}"
NODE_ENV="${NODE_ENV:-development}"
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}}"

export POSTGRES_DATA_DIR POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB PORT NODE_ENV DATABASE_URL

mkdir -p "${POSTGRES_DATA_DIR}" /var/log/postgresql
chown -R postgres:postgres /var/lib/postgresql
chown -R postgres:postgres "${POSTGRES_DATA_DIR}"

if [ ! -s "${POSTGRES_DATA_DIR}/PG_VERSION" ]; then
  log "initializing PostgreSQL data directory"
  su postgres -c "${PG_BINDIR}/initdb -D '${POSTGRES_DATA_DIR}' --encoding=UTF8 --locale=C"
  cat <<'HBA' > "${POSTGRES_DATA_DIR}/pg_hba.conf"
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
HBA
  cat <<'CONF' > "${POSTGRES_DATA_DIR}/postgresql.conf"
listen_addresses = '*'
shared_buffers = 256MB
max_connections = 100
CONF
fi

PG_CTL="${PG_BINDIR}/pg_ctl"

stop_postgres() {
  if su postgres -c "${PG_CTL} -D '${POSTGRES_DATA_DIR}' status" >/dev/null 2>&1; then
    log "stopping PostgreSQL"
    su postgres -c "${PG_CTL} -D '${POSTGRES_DATA_DIR}' -m fast stop" || true
  fi
}

stop_backend() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    log "stopping backend"
    pkill -P "${BACKEND_PID}" 2>/dev/null || true
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

cleanup() {
  stop_backend
  stop_postgres
}

trap cleanup EXIT INT TERM

log "starting PostgreSQL"
su postgres -c "${PG_CTL} -D '${POSTGRES_DATA_DIR}' -l /var/log/postgresql/postgresql.log -o \"-c listen_addresses='*'\" -w start"

log "ensuring role ${POSTGRES_USER} exists"
su postgres -c "psql -v ON_ERROR_STOP=1 -v app_user=${POSTGRES_USER} -v app_password=${POSTGRES_PASSWORD} <<'SQL'
DO
$$
DECLARE
  role_name text := :'app_user';
  role_pass text := :'app_password';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', role_name, role_pass);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', role_name, role_pass);
  END IF;
END;
$$;
SQL"

log "ensuring database ${POSTGRES_DB} exists"
su postgres -c "psql -v ON_ERROR_STOP=1 -v app_db=${POSTGRES_DB} -v app_user=${POSTGRES_USER} <<'SQL'
DO
$$
DECLARE
  db_name text := :'app_db';
  role_name text := :'app_user';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = db_name) THEN
    EXECUTE format('CREATE DATABASE %I OWNER %I', db_name, role_name);
  ELSE
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', db_name, role_name);
  END IF;
END;
$$;
SQL"

log "applying extensions"
su postgres -c "psql -v ON_ERROR_STOP=1 -d ${POSTGRES_DB} <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL"

apply_sql() {
  local file="$1"
  if [ -f "$file" ]; then
    log "running $(basename "$file")"
    su postgres -c "psql -v ON_ERROR_STOP=1 -d ${POSTGRES_DB} -f '$file'"
  fi
}

SQL_DIR="/app/backend/sql"
apply_sql "${SQL_DIR}/init.sql"
for f in "${SQL_DIR}"/migrations/[0-9]*.sql; do
  apply_sql "$f"
done

log "starting backend API on port ${PORT}"
runuser -u node -- env PORT="${PORT}" NODE_ENV="${NODE_ENV}" DATABASE_URL="${DATABASE_URL}" \
  JWT_SECRET="${JWT_SECRET:-}" JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-}" \
  CLIENT_URL="${CLIENT_URL:-}" EMAIL_ENABLED="${EMAIL_ENABLED:-false}" \
  node /app/backend/dist/index.js &
BACKEND_PID=$!
wait "${BACKEND_PID}"
