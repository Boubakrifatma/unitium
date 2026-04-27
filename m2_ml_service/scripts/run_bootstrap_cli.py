#!/usr/bin/env python3
"""
CLI wrapper for BootstrapService — runs inference without FastAPI/uvicorn.

Usage:
    python run_bootstrap_cli.py --input payload.json
    python run_bootstrap_cli.py --input payload.json --models-dir /path/to/models

The script loads models from the models/ directory (same default as the FastAPI server),
calls process_bootstrap() with the JSON payload, and writes the result to stdout as JSON.

Exit codes:
    0 — success, JSON result written to stdout
    1 — validation/processing error, error JSON written to stdout
    2 — fatal/unexpected error, message written to stderr
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run PIB bootstrap inference from CLI")
    parser.add_argument("--input", required=True, help="Path to JSON payload file")
    parser.add_argument(
        "--models-dir",
        default=None,
        help="Path to models directory (default: <repo_root>/m2_ml_service/models/)",
    )
    args = parser.parse_args()

    # Resolve models_dir
    if args.models_dir:
        models_dir = Path(args.models_dir).expanduser().resolve()
    else:
        models_dir = Path(__file__).resolve().parents[1] / "models"

    # Load payload
    try:
        payload_path = Path(args.input).expanduser().resolve()
        with payload_path.open("r", encoding="utf-8") as fp:
            payload = json.load(fp)
    except (OSError, json.JSONDecodeError) as exc:
        json.dump({"error": "input_error", "detail": str(exc)}, sys.stdout)
        sys.exit(1)

    # Bootstrap and run
    try:
        # Import here so path manipulation above happens first
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from services.bootstrap_service import BootstrapService

        service = BootstrapService(models_dir=models_dir)
        service.initialize()
        result = service.process_bootstrap(payload)
        json.dump(result, sys.stdout, default=str)
        sys.exit(0)
    except Exception as exc:
        # Catch HTTPException (validation errors from process_bootstrap) and generic errors
        exc_type = type(exc).__name__
        detail = getattr(exc, "detail", str(exc))
        status_code = getattr(exc, "status_code", None)
        error_doc = {"error": exc_type, "detail": detail}
        if status_code is not None:
            error_doc["status_code"] = status_code
        json.dump(error_doc, sys.stdout, default=str)
        sys.exit(1 if status_code and status_code < 500 else 2)


if __name__ == "__main__":
    main()
