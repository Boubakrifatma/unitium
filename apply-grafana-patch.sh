#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Applying Grafana Deployment Patch                         ║"
echo "╚════════════════════════════════════════════════════════════╝"

kubectl patch deployment grafana -n monitoring --type=json -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/volumes/1",
    "value": {
      "name": "dashboard-provisioning",
      "configMap": {
        "name": "grafana-dashboard-provisioning",
        "items": [{"key": "dashboards.yaml", "path": "dashboards.yaml"}]
      }
    }
  },
  {
    "op": "replace",
    "path": "/spec/template/spec/volumes/2",
    "value": {
      "name": "dashboard-json",
      "configMap": {
        "name": "grafana-dashboard-piprojet",
        "items": [{"key": "piprojet-dashboard.json", "path": "piprojet-dashboard.json"}]
      }
    }
  }
]'

echo ""
echo "✅ Patch applied successfully!"
echo ""
echo "Restarting Grafana..."
kubectl rollout restart deployment/grafana -n monitoring

echo ""
echo "Waiting for Grafana to be ready..."
kubectl get pods -n monitoring -w
