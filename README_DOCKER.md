# Docker and Kubernetes Notes (Module-2)

This document summarizes the Docker/Kubernetes additions and how to run the stack locally or with a public ML endpoint.

## What Was Added

- Backend container build
  - Pi_Projet/Dockerfile
  - Pi_Projet/.dockerignore
- Frontend container build + nginx reverse proxy
  - Pi_ProjetFront/Dockerfile
  - Pi_ProjetFront/.dockerignore
  - Pi_ProjetFront/nginx.conf
- ML service container build
  - m2_ml_service/Dockerfile
  - m2_ml_service/.dockerignore
- Compose orchestration for MySQL, backend, frontend, and m2_ml_service
  - docker-compose.yml
- Kubernetes manifests for backend, frontend, MySQL, MetalLB, and ML service
  - k8s/*
- Configurable ML endpoint via env var
  - Pi_Projet/src/main/resources/application.properties
  - k8s/backend-configmap.yaml

## Containers in Compose

- mysql
- m2_ml_service
- backend
- frontend

## Local Run (All 4 Containers)

```
docker-compose up --build
```

## Use Public Cloud ML Endpoint

Start with a public ML URL:

```
ML_SERVICE_BASE_URL="https://your-ml-cloud.example" docker-compose up --build
```

Or switch after startup:

```
docker-compose stop backend
ML_SERVICE_BASE_URL="https://your-ml-cloud.example" docker-compose up -d backend
```

Then stop local ML if you want:

```
docker-compose stop m2_ml_service
```

## Kubernetes ML Endpoint Override

Edit the ML URL in k8s/backend-configmap.yaml and re-apply:

```
kubectl apply -f k8s/backend-configmap.yaml
kubectl rollout restart deployment/backend
```

## Notes

- Ensure m2_ml_service/models/* files are committed so the ML container can initialize after a clean pull.
- The backend expects ML at http://m2_ml_service:8000 by default unless overridden.

## Plan: Switch From Local ML to Public ML

1) Start all 4 containers:
```
docker-compose up --build
```

2) Restart backend with the public ML URL:
```
docker-compose stop backend
ML_SERVICE_BASE_URL="https://your-ml-cloud.example" docker-compose up -d backend
```

3) Stop local ML:
```
docker-compose stop m2_ml_service
```

Expected behavior:
- Frontend may show red briefly when local ML stops.
- Once backend reaches the public ML URL, the frontend should turn green again.
