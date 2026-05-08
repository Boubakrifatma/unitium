# CI/CD Pipeline — GitHub Actions + DockerHub + Kubernetes

This document explains how the CI/CD pipeline works and how to activate it end-to-end.

---

## How it works (big picture)

```
You push code to branch: dockerize-k8s-module2
              ↓
GitHub Actions (cloud — free, no setup needed)
  ├─ Builds Docker image for Angular frontend
  ├─ Builds Docker image for Spring Boot backend
  ├─ Builds Docker image for ML service
  └─ Pushes all 3 images to DockerHub
              ↓
GitHub Actions (self-hosted runner — runs on Fatma's VM)
  ├─ Updates frontend  deployment in Kubernetes → new image
  ├─ Updates backend   deployment in Kubernetes → new image
  └─ Updates ml-service deployment in Kubernetes → new image
              ↓
Kubernetes does a rolling restart — zero downtime, new code is live
```

**Cost: $0.** GitHub Actions free tier covers it. DockerHub public repos are free.

---

## Status checklist

| Step | Status |
|------|--------|
| GitHub secrets added (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) | Done |
| Workflow file created (`.github/workflows/ci-cd.yml`) | Done |
| K8s manifests updated with real image names | Done |
| Self-hosted runner installed on Fatma's VM | **TODO — follow Section 2 below** |

---

## Section 1 — Push your code and trigger the pipeline

Once you commit and push to the right branch, the pipeline starts automatically.

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin dockerize-k8s-module2
```

Then go to your GitHub repo → **Actions** tab.  
You will see a workflow run appear. Click it to watch the logs live.

- **Job 1 (Build & Push)** will succeed immediately — it builds the 3 images and pushes them to DockerHub under `fatmaboubakri/piprojet-frontend`, `fatmaboubakri/piprojet-backend`, `fatmaboubakri/piprojet-ml-service`.
- **Job 2 (Deploy to K8s)** will fail or wait until you complete Section 2 below.

---

## Section 2 — Install the self-hosted runner on Fatma's VM

This is a one-time setup. The runner is a small background process that lets GitHub Actions run `kubectl` commands on Fatma's machine.

### Step 1 — Go to GitHub and get the 3 commands

On your GitHub repo:  
**Settings → Actions → Runners → New self-hosted runner**  
Select: **Linux** → **x64**

GitHub will show you 3 blocks of commands. They look like this (yours will have a real token):

```bash
# Block 1 — Download
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.x.x.tar.gz -L https://github.com/actions/runner/releases/download/...
tar xzf ./actions-runner-linux-x64-2.x.x.tar.gz

# Block 2 — Configure (this links the runner to YOUR repo)
./config.sh --url https://github.com/YOUR_ORG/PiProjetByUnitum --token YOUR_TOKEN

# Block 3 — Run it once to test
./run.sh
```

### Step 2 — Run those 3 commands on Fatma's VM

Open a terminal on Fatma's Linux VM and paste each block one by one.

When `./run.sh` runs you will see:
```
√ Connected to GitHub
Listening for Jobs
```

That means it is working. Press `Ctrl+C` for now.

### Step 3 — Install it as a permanent background service

So the runner survives reboots and always listens, run these two commands:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

To check it is running:
```bash
sudo ./svc.sh status
```

### Step 4 — Verify in GitHub

Go to your repo → **Settings → Actions → Runners**  
You should see your runner listed with a green dot and status **Idle**.

---

## Section 3 — Apply the updated K8s manifests (one time only)

The k8s manifests now have the real image names. Apply them to the cluster once so Kubernetes knows about them:

```bash
# On Fatma's VM, inside the project folder
kubectl apply -f k8s/
```

Then check everything is up:
```bash
kubectl get pods
kubectl get deployments
```

---

## Section 4 — Full flow from now on (nothing to do, it's automatic)

From this point on, the full cycle is:

1. You make code changes on your machine
2. You run `git push origin dockerize-k8s-module2`
3. GitHub Actions builds the images (takes ~5–10 minutes)
4. New images are pushed to DockerHub with two tags:
   - `:latest`
   - `:abc1234` (7-character commit SHA — for traceability)
5. The self-hosted runner on Fatma's VM tells Kubernetes to pull the new images
6. Kubernetes does a rolling restart — old pods stay up until new pods are healthy
7. New code is live

---

## Section 5 — Useful commands to verify deployment

Run these on Fatma's VM:

```bash
# Watch pods restart in real time
kubectl get pods -w

# Check which image version is running
kubectl describe pod -l app=frontend | grep Image
kubectl describe pod -l app=backend  | grep Image

# Check rollout history
kubectl rollout history deployment/frontend
kubectl rollout history deployment/backend
kubectl rollout history deployment/m2-ml-service

# Roll back to previous version if something breaks
kubectl rollout undo deployment/frontend
kubectl rollout undo deployment/backend
kubectl rollout undo deployment/m2-ml-service
```

---

## Section 6 — Troubleshooting

### Pipeline fails at "Build & Push" step
- Check that both GitHub secrets are set correctly: `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
- Go to GitHub repo → **Settings → Secrets and variables → Actions** and verify they exist

### Pipeline fails at "Deploy to K8s" step
- The self-hosted runner is not running → go to Fatma's VM and run `sudo ./svc.sh status`
- If stopped: `sudo ./svc.sh start`
- Check runner is visible in GitHub: **Settings → Actions → Runners** (should show green dot)

### Kubernetes pods are not updating after pipeline success
- Make sure you ran `kubectl apply -f k8s/` at least once (Section 3)
- Check `imagePullPolicy: Always` is present in the deployment manifests

### Build is very slow on first run
- Normal. The first build downloads all base images (~500 MB for Spring Boot, ~300 MB for Node).
- From the second push onwards, Docker layer caching makes it much faster (~1–2 min).

---

## Files created by this setup

```
.github/
  workflows/
    ci-cd.yml              ← the full pipeline definition

k8s/
  frontend-deployment.yaml   ← updated: fatmaboubakri/piprojet-frontend + imagePullPolicy
  backend-deployment.yaml    ← updated: fatmaboubakri/piprojet-backend  + imagePullPolicy
  m2-ml-deployment.yaml      ← updated: fatmaboubakri/piprojet-ml-service + imagePullPolicy
  (all other k8s files unchanged)
```

---

## DockerHub images (created automatically by the pipeline)

| Image | DockerHub repo |
|-------|---------------|
| Angular frontend | `fatmaboubakri/piprojet-frontend` |
| Spring Boot backend | `fatmaboubakri/piprojet-backend` |
| Python ML service | `fatmaboubakri/piprojet-ml-service` |
