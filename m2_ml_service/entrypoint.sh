#!/usr/bin/env sh
set -e

if [ "${SEED_PIB_DATA:-false}" = "true" ]; then
  echo "[entrypoint] Seeding PIB training data..."
  python scripts/seed_pib_training_data.py
  echo "[entrypoint] Seeding complete."
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000
