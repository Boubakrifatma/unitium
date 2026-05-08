# syntax=docker/dockerfile:1.4
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu
ARG TORCH_VERSION=2.1.0+cpu

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
	printf "torch==%s\n" "$TORCH_VERSION" > /tmp/constraints.txt && \
	pip install -r requirements.txt -c /tmp/constraints.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
