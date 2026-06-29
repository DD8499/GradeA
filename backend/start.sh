#!/usr/bin/env bash
set -eu
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
