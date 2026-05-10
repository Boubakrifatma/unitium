#!/bin/bash
# Run this after deploying to get your public ngrok URL
# Then update CORS_ALLOWED_ORIGINS in backend-configmap.yaml and reapply

echo "Waiting for ngrok to start..."
kubectl wait --for=condition=ready pod -l app=ngrok -n piprojet --timeout=60s

echo ""
echo "Your public ngrok URL is:"
kubectl exec -n piprojet deploy/ngrok -- \
  wget -qO- http://localhost:4040/api/tunnels 2>/dev/null \
  | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4

echo ""
echo "Update CORS_ALLOWED_ORIGINS in backend-configmap.yaml with this URL, then run:"
echo "  kubectl apply -f backend-configmap.yaml -n piprojet"
echo "  kubectl rollout restart deployment/backend -n piprojet"
