#!/usr/bin/env bash
set -euo pipefail
cd backend
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
