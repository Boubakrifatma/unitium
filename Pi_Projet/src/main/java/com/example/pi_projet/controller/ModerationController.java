package com.example.pi_projet.controller;

import com.example.pi_projet.annotation.Authorized;
import com.example.pi_projet.dto.ModerationActionRequest;
import com.example.pi_projet.dto.ReportDTO;
import com.example.pi_projet.dto.ReportRequest;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/chat/moderation")
@Authorized
@RequiredArgsConstructor
public class ModerationController {

    private final ModerationService moderationService;

    @PostMapping("/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportDTO createReport(@RequestBody ReportRequest body, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.createReport(body, currentUser);
    }

    @GetMapping("/reports/pending")
    public List<ReportDTO> getPendingReports(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.getPendingReports(currentUser);
    }

    @GetMapping("/reports/all")
    public List<ReportDTO> getAllReports(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.getAllReports(currentUser);
    }

    @GetMapping("/reports/count")
    public long getPendingReportCount(HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.getPendingReportCount(currentUser);
    }

    @PutMapping("/reports/{id}/action")
    public ReportDTO takeAction(@PathVariable Long id,
                                @RequestBody ModerationActionRequest body,
                                HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.takeAction(id, body, currentUser);
    }

    @PutMapping("/reports/{id}/dismiss")
    public ReportDTO dismissReport(@PathVariable Long id, HttpServletRequest request) {
        User currentUser = (User) request.getAttribute("currentUser");
        return moderationService.dismissReport(id, currentUser);
    }
}
