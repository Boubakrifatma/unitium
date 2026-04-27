package com.example.pi_projet.dto;

public record AiRecommendationRequest(
        String deliverableTitle,
        String taskTitle,
        String description,
        double score
) {}
