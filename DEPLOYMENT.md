# 🚀 Production Deployment Guide

This project is now **fully dynamic and production-ready**. No hardcoded IPs or ports!

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (nginx)          Backend (Spring Boot)               │
│  ↓                         ↓                                    │
│  Port: 80                  Port: 8084                          │
│  Service DNS: frontend     Service DNS: backend                │
│                                                                 │
│           ↓ (proxy_pass http://backend:8084)                  │
│           Communicates internally via K8s DNS                  │
│                                                                 │
│  ┌──────────────────────────────────────────┐                 │
│  │ MySQL (service: mysql:3306)              │                 │
│  │ ML Service (service: m2-ml-service:8000) │                 │
│  └──────────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         ↓
    MetalLB LoadBalancer (assigns external IPs)
         ↓
    Frontend: 192.168.1.200 (automatically assigned)
    Backend: 192.168.1.201 (automatically assigned)
```

## Dynamic Configuration

### All URLs use Kubernetes Service DNS (K8s DNS names)

✅ **Frontend nginx** → `http://backend:8084` (not IP)
✅ **Backend** → `http://mysql:3306` (not localhost)
✅ **Backend** → `http://m2-ml-service:8000` (not localhost)
✅ **Frontend** → `http://frontend:80` (not IP)

### All Environment Variables are Externalized

Every configuration that might change is in **backend-configmap.yaml**:

```yaml
ML_SERVICE_BASE_URL: "http://m2-ml-service:8000"
CORS_ALLOWED_ORIGINS: "http://frontend,http://backend,..."
SPRING_MAIL_HOST: "smtp.gmail.com"
BILLING_APP_URL: "http://frontend:80"
```

## Deployment Scenarios

### Local Development (localhost)
```bash
# Works: Service DNS resolves to services
curl http://frontend:80
curl http://backend:8084
```

### Kubernetes (cluster internal)
```bash
# Works: Service DNS is the standard way
kubectl apply -f k8s/
# Frontend reaches backend via: http://backend:8084
```

### External ngrok tunnel
```bash
# Run ngrok script for testing
.\scripts\expose-frontend-ngrok.ps1
# Frontend still uses service DNS internally
# ngrok tunnels the result to public URL
```

### Production (any infrastructure)
```bash
# Same manifests work everywhere
# Kubernetes handles service discovery
# No IP changes needed
```

## Key Points

1. **Service DNS**: `frontend`, `backend`, `mysql`, `m2-ml-service`
   - Work automatically inside K8s
   - Don't change across environments

2. **ConfigMaps**: Define all external URLs
   - Change once, applies to everything
   - No code modifications needed

3. **Environment Variables**: Override any setting
   - Passwords, hosts, ports all configurable
   - Kubernetes secrets handle sensitive data

4. **Kubernetes handles the rest**:
   - MetalLB assigns LoadBalancer IPs
   - DNS service discovery works automatically
   - Networking is abstracted away

## Verification

```bash
# Check service DNS resolution
kubectl exec -it frontend-pod -n piprojet -- nslookup backend

# Check ConfigMap values
kubectl get configmap backend-configmap -n piprojet -o yaml

# Verify all services are discoverable
kubectl get svc -n piprojet
```

## To Deploy

```bash
# First time
kubectl apply -f k8s/

# After changes
git push origin dockerize-k8s-module2
# GitHub Actions handles the rest!
```

**No manual IP/port changes needed ever again!** ✅
