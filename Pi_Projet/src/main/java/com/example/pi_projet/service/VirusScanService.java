package com.example.pi_projet.service;

import com.example.pi_projet.dto.ScanResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/**
 * Talks to a ClamAV daemon (clamd) over TCP using the INSTREAM protocol.
 *
 * Protocol summary:
 *   1. Open TCP socket to clamd (default port 3310).
 *   2. Send the literal command: "zINSTREAM\0".
 *   3. Stream the file in chunks: each chunk is preceded by a 4-byte
 *      big-endian length. End the stream with a length of 0.
 *   4. Read the response line, e.g.:
 *        "stream: OK"                          → clean
 *        "stream: Eicar-Test-Signature FOUND"  → infected (virus name extracted)
 *
 * Behaviour when clamd is unreachable depends on `clamav.mode`:
 *   - strict     → throw VirusScanUnavailableException (caller rejects upload)
 *   - permissive → return ScanResult.unverified() so upload proceeds with a flag
 */
@Slf4j
@Service
public class VirusScanService {

    private static final int CHUNK_SIZE = 2048;

    private final String host;
    private final int    port;
    private final int    connectTimeoutMs;
    private final int    readTimeoutMs;
    private final Mode   mode;

    public VirusScanService(
            @Value("${clamav.host:localhost}")             String host,
            @Value("${clamav.port:3310}")                  int port,
            @Value("${clamav.connect-timeout-ms:4000}")    int connectTimeoutMs,
            @Value("${clamav.read-timeout-ms:20000}")      int readTimeoutMs,
            @Value("${clamav.mode:permissive}")            String mode) {
        this.host = host;
        this.port = port;
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.mode = Mode.parse(mode);
        log.info("VirusScanService initialised — clamd={}:{} mode={}", host, port, this.mode);
    }

    /** Scan an arbitrary input stream. The stream is consumed and closed. */
    public ScanResult scanFile(InputStream fileStream) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), connectTimeoutMs);
            socket.setSoTimeout(readTimeoutMs);

            try (OutputStream out = new BufferedOutputStream(socket.getOutputStream());
                 InputStream  in  = socket.getInputStream();
                 InputStream  src = fileStream) {

                out.write("zINSTREAM\0".getBytes(StandardCharsets.US_ASCII));
                out.flush();

                byte[] buf = new byte[CHUNK_SIZE];
                int read;
                while ((read = src.read(buf)) != -1) {
                    if (read == 0) continue;
                    out.write(ByteBuffer.allocate(4).putInt(read).array());
                    out.write(buf, 0, read);
                }
                // End-of-stream marker (length 0)
                out.write(new byte[]{0, 0, 0, 0});
                out.flush();

                String response = readResponse(in);
                return interpret(response);
            }
        } catch (IOException e) {
            log.warn("ClamAV scan failed ({}): {}", e.getClass().getSimpleName(), e.getMessage());
            if (mode == Mode.STRICT) {
                throw new VirusScanUnavailableException("Antivirus unreachable", e);
            }
            return ScanResult.unverified();
        }
    }

    private String readResponse(InputStream in) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        int b;
        while ((b = in.read()) != -1) {
            if (b == 0) break;        // clamd terminates the response with NUL
            baos.write(b);
        }
        return baos.toString(StandardCharsets.US_ASCII).trim();
    }

    private ScanResult interpret(String response) {
        // Expected formats:
        //   stream: OK
        //   stream: Eicar-Test-Signature FOUND
        //   INSTREAM size limit exceeded ERROR
        if (response == null || response.isBlank()) {
            log.warn("Empty ClamAV response — treating as unverified");
            return mode == Mode.STRICT
                    ? infectedFallbackOnEmpty()
                    : ScanResult.unverified();
        }
        if (response.endsWith("OK")) {
            return ScanResult.clean();
        }
        if (response.endsWith("FOUND")) {
            // "stream: <SignatureName> FOUND" → extract <SignatureName>
            String body = response.substring(response.indexOf(':') + 1).trim();
            String virus = body.substring(0, body.lastIndexOf(' ')).trim();
            log.warn("ClamAV detected virus: {}", virus);
            return ScanResult.infected(virus);
        }
        // ERROR or anything we don't recognise
        log.warn("Unexpected ClamAV response: {}", response);
        if (mode == Mode.STRICT) {
            throw new VirusScanUnavailableException("Unexpected scanner response: " + response);
        }
        return ScanResult.unverified();
    }

    /** In strict mode an empty response is suspicious — better safe than sorry. */
    private ScanResult infectedFallbackOnEmpty() {
        throw new VirusScanUnavailableException("Empty scanner response");
    }

    public boolean isStrict() { return mode == Mode.STRICT; }

    public enum Mode {
        STRICT, PERMISSIVE;
        static Mode parse(String s) {
            return "strict".equalsIgnoreCase(s) ? STRICT : PERMISSIVE;
        }
    }

    /** Thrown only in strict mode when clamd cannot give a verdict. */
    public static class VirusScanUnavailableException extends RuntimeException {
        public VirusScanUnavailableException(String msg)              { super(msg); }
        public VirusScanUnavailableException(String msg, Throwable t) { super(msg, t); }
    }
}
