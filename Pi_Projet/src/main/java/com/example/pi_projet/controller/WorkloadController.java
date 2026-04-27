package com.example.pi_projet.controller;

import com.example.pi_projet.dto.WorkloadPressureDto;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.WorkloadService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workload")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class WorkloadController {

    private final WorkloadService workloadService;

    /**
     * GET /api/workload/pressure
     * Returns the pressure indicator and weekly plan for the authenticated user.
     */
    @GetMapping("/pressure")
    public ResponseEntity<WorkloadPressureDto> getPressure(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        if (currentUser == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(workloadService.getPressure(currentUser.getId()));
    }
}
