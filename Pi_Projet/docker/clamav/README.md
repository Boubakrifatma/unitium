# ClamAV antivirus for deliverable uploads

`VirusScanService` connects to clamd over TCP using the **INSTREAM** protocol.
This compose file provisions the daemon locally so the Spring app can scan
every deliverable file before it is persisted.

## Start

```bash
docker compose -f Pi_Projet/docker/clamav/docker-compose.yml up -d
```

The first boot downloads ~250 MB of virus signatures (`freshclam`). Wait until
the `pi-clamav` container reports **healthy** (`docker ps`) before submitting
a deliverable — until then, scans will fall back to the configured
`clamav.mode` behavior:

- `clamav.mode=strict`     → uploads are rejected with **HTTP 503**.
- `clamav.mode=permissive` → uploads succeed but are flagged as `unverified`.

## Test with the EICAR signature

```bash
curl -F "file=@eicar.com" http://localhost:8084/api/files/upload
# → HTTP 422  Fichier rejeté : virus détecté (Win.Test.EICAR_HDB-1)
```

## Configure

In `Pi_Projet/src/main/resources/application.properties`:

```properties
clamav.host=localhost
clamav.port=3310
clamav.mode=permissive       # or strict
clamav.connect-timeout-ms=4000
clamav.read-timeout-ms=20000

deliverable.upload.allowed-types=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed
deliverable.upload.allowed-extensions=pdf,docx,zip
deliverable.upload.max-size-mb=25
```
