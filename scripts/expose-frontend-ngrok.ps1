# Helper script to expose frontend via ngrok for safe testing (Windows PowerShell)
# Usage: .\scripts\expose-frontend-ngrok.ps1

$NAMESPACE = "piprojet"
$SERVICE = "frontend-lb"
$LOCAL_PORT = 8080

Write-Host "🚀 Starting frontend exposure via ngrok..." -ForegroundColor Green
Write-Host ""

# Check if ngrok is installed
try {
    ngrok --version > $null 2>&1
} catch {
    Write-Host "❌ ngrok not installed. Install from https://ngrok.com/download" -ForegroundColor Red
    exit 1
}

# Check if kubectl is accessible
try {
    kubectl cluster-info > $null 2>&1
} catch {
    Write-Host "❌ kubectl not configured. Configure kubeconfig first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ ngrok and kubectl found" -ForegroundColor Green
Write-Host ""
Write-Host "Starting two processes (keep both running):" -ForegroundColor Yellow
Write-Host "1️⃣  kubectl port-forward → 0.0.0.0:$LOCAL_PORT"
Write-Host "2️⃣  ngrok http localhost:$LOCAL_PORT"
Write-Host ""

# Function to cleanup on exit
function Cleanup {
    Write-Host ""
    Write-Host "⛔ Stopping ngrok and port-forward..." -ForegroundColor Red
    Get-Process | Where-Object { $_.ProcessName -like "*kubectl*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.ProcessName -like "*ngrok*" } | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Register cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } > $null

# Start port-forward in background
Write-Host "Starting port-forward..."
$portForwardJob = Start-Process -FilePath "kubectl" -ArgumentList "port-forward", "-n", $NAMESPACE, "svc/$SERVICE", "$LOCAL_PORT`:80", "--address=0.0.0.0" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

# Start ngrok in foreground
Write-Host ""
Write-Host "🔌 Starting ngrok tunnel..." -ForegroundColor Cyan
Write-Host "When you see 'Forwarding', your app is accessible via that public URL!"
Write-Host ""
ngrok http localhost:$LOCAL_PORT

