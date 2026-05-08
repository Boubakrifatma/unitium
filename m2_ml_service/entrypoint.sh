#!/usr/bin/env sh
set -e

if [ "${SEED_PIB_DATA:-false}" = "true" ]; then
  echo "[entrypoint] Seeding PIB training data..."
  python scripts/seed_pib_training_data.py
  echo "[entrypoint] Seeding complete."
fi

if [ "${EXPORT_PIB_ARTIFACTS:-true}" = "true" ]; then
  if [ ! -f "/app/models/template_embeddings.npy" ] || [ ! -f "/app/models/template_metadata.csv" ]; then
    echo "[entrypoint] Exporting PIB artifacts..."
    python scripts/export_pib_artifacts.py
    echo "[entrypoint] Export complete."
  fi
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000
