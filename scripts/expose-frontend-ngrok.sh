#!/bin/bash
# Helper script to expose frontend via ngrok for safe testing
# Usage: ./scripts/expose-frontend-ngrok.sh

set -e

NAMESPACE="piprojet"
SERVICE="frontend-lb"
LOCAL_PORT=8080

echo "🚀 Starting frontend exposure via ngrok..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not installed. Install from https://ngrok.com/download"
    exit 1
fi

# Check if kubectl is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl not configured. Configure kubeconfig first."
    exit 1
fi

echo "✅ ngrok and kubectl found"
echo ""
echo "Starting two processes (keep both running):"
echo "1️⃣  kubectl port-forward → 0.0.0.0:$LOCAL_PORT"
echo "2️⃣  ngrok http localhost:$LOCAL_PORT"
echo ""

# Kill both processes on exit
cleanup() {
    echo ""
    echo "⛔ Stopping ngrok and port-forward..."
    pkill -f "kubectl port-forward" || true
    pkill -f "ngrok http" || true
}
trap cleanup EXIT

# Start port-forward in background
echo "Starting port-forward..."
kubectl port-forward -n $NAMESPACE svc/$SERVICE $LOCAL_PORT:80 --address=0.0.0.0 &
PORT_FORWARD_PID=$!
sleep 2

# Start ngrok in foreground (so logs are visible)
echo ""
echo "🔌 Starting ngrok tunnel..."
echo "When you see 'Forwarding', your app is accessible via that public URL!"
echo ""
ngrok http localhost:$LOCAL_PORT

