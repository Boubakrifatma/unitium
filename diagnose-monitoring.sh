#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  MONITORING DIAGNOSTICS - AUTOMATED                        ║"
echo "╚════════════════════════════════════════════════════════════╝"

echo -e "\n[1/10] Checking pod status..."
PODS=$(kubectl get pods -n monitoring --no-headers)
echo "$PODS"
RUNNING=$(echo "$PODS" | grep -c "Running")
TOTAL=$(echo "$PODS" | wc -l)
echo "→ Running: $RUNNING/$TOTAL"

echo -e "\n[2/10] Checking Prometheus pod details..."
kubectl get pod -n monitoring -l app=prometheus -o json 2>/dev/null | \
  jq '.items[0] | {name: .metadata.name, ready: .status.containerStatuses[0].ready, restarts: .status.containerStatuses[0].restartCount}' 2>/dev/null || echo "❌ Prometheus pod not found"

echo -e "\n[3/10] Checking Prometheus config..."
kubectl exec -n monitoring -l app=prometheus -- cat /etc/prometheus/prometheus.yml 2>/dev/null | head -15 || echo "❌ Cannot read config"

echo -e "\n[4/10] Checking Prometheus logs (last 30 lines)..."
kubectl logs -n monitoring -l app=prometheus --tail=30 2>/dev/null | tail -10

echo -e "\n[5/10] Checking Grafana datasource..."
kubectl get configmap -n monitoring grafana-datasource -o yaml 2>/dev/null | grep -A 3 "url:" || echo "❌ Datasource not found"

echo -e "\n[6/10] Number of scrape targets..."
COUNT=$(kubectl exec -n monitoring -l app=prometheus -- curl -s http://localhost:9090/api/v1/targets 2>/dev/null | jq '.data.activeTargets | length' 2>/dev/null)
echo "→ Found $COUNT targets (should be > 5)"

echo -e "\n[7/10] Checking target health..."
kubectl exec -n monitoring -l app=prometheus -- curl -s http://localhost:9090/api/v1/targets 2>/dev/null | \
  jq '.data.activeTargets[] | {job: .labels.job, health, lastError}' 2>/dev/null | head -30

echo -e "\n[8/10] Checking if Prometheus has metrics..."
COUNT=$(kubectl exec -n monitoring -l app=prometheus -- curl -s 'http://localhost:9090/api/v1/query?query=up' 2>/dev/null | jq '.data.result | length' 2>/dev/null)
echo "→ Found $COUNT metric results (should be > 0)"

echo -e "\n[9/10] Checking services..."
kubectl get svc -n monitoring -o wide

echo -e "\n[10/10] Checking events..."
kubectl get events -n monitoring --sort-by='.lastTimestamp' | tail -10

echo -e "\n╔════════════════════════════════════════════════════════════╗"
echo "║  SUMMARY                                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ "$RUNNING" -eq "$TOTAL" ]; then
  echo "✅ All pods are Running"
else
  echo "❌ Some pods are NOT Running (check above)"
fi

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Prometheus has metrics ($COUNT results)"
else
  echo "❌ Prometheus has NO metrics - check scrape targets"
fi

echo -e "\n📍 Next step:"
echo "   kubectl port-forward -n monitoring svc/prometheus 9090:9090"
echo "   Then visit: http://localhost:9090/targets"
echo ""
echo "   If targets show DOWN, that's why you have no data!"
