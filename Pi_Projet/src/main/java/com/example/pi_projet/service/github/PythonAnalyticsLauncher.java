package com.example.pi_projet.service.github;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Auto-launches the Python git-service (FastAPI) at Spring Boot startup, if
 * `app.git.python.enabled=true`. The Python service is responsible for
 * lightweight commit analytics / advanced stats called from the dashboard.
 *
 * Disabled by default so it does not get in the way of unit tests.
 *
 * Configuration (application.properties):
 *   app.git.python.enabled=true
 *   app.git.python.script=../git-service/main.py        (relative to working dir)
 *   app.git.python.executable=python                    (or python3 / py)
 *   app.git.python.workdir=../git-service               (cwd for the process)
 */
@Slf4j
@Component
public class PythonAnalyticsLauncher implements ApplicationRunner {

    @Value("${app.git.python.enabled:false}")
    private boolean enabled;

    @Value("${app.git.python.script:../git-service/main.py}")
    private String scriptPath;

    @Value("${app.git.python.executable:python}")
    private String executable;

    @Value("${app.git.python.workdir:../git-service}")
    private String workDir;

    private Process process;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("[GitPython] Disabled (set app.git.python.enabled=true to start at boot).");
            return;
        }
        Path script = Paths.get(scriptPath).toAbsolutePath();
        if (!Files.exists(script)) {
            log.warn("[GitPython] Script not found at {} — skipping.", script);
            return;
        }
        File cwd = new File(workDir);
        if (!cwd.isDirectory()) {
            log.warn("[GitPython] Working dir not found at {} — skipping.", cwd.getAbsolutePath());
            return;
        }
        try {
            ProcessBuilder pb = new ProcessBuilder(executable, script.toString())
                    .directory(cwd)
                    .redirectErrorStream(true)
                    .inheritIO();
            this.process = pb.start();
            log.info("[GitPython] Started analytics service (pid={}, script={}).",
                    process.pid(), script);
        } catch (IOException e) {
            log.error("[GitPython] Failed to launch: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void shutdown() {
        if (process != null && process.isAlive()) {
            log.info("[GitPython] Stopping analytics process (pid={})…", process.pid());
            process.destroy();
            try {
                if (!process.waitFor(java.time.Duration.ofSeconds(5).toMillis(),
                        java.util.concurrent.TimeUnit.MILLISECONDS)) {
                    process.destroyForcibly();
                }
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
