#!/usr/bin/env bash
# Sobe backend (FastAPI :8000) e frontend (Next.js :3000) juntos.
# Uso: ./dev.sh   (Ctrl+C encerra os dois)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "Encerrando backend e frontend..."
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill -- -"$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

command -v uv >/dev/null || { echo "Erro: 'uv' não encontrado."; exit 1; }
command -v npm >/dev/null || { echo "Erro: 'npm' não encontrado."; exit 1; }

# Instala dependências do frontend se ainda não existirem
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Instalando dependências do frontend..."
  (cd "$ROOT/frontend" && npm install)
fi

# Cada serviço roda em seu próprio grupo de processos (setsid) para o kill pegar os filhos.
prefix() { sed -u "s/^/[$1] /"; }

(cd "$ROOT/backend" && setsid uv run fastapi dev src/pdf_to_md/main.py 2>&1 | prefix backend) &
PIDS+=($!)

(cd "$ROOT/frontend" && setsid npm run dev 2>&1 | prefix frontend) &
PIDS+=($!)

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Ctrl+C para parar."

wait
