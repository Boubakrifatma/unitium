package com.example.pi_projet.dto;

public record MessageRequest(
        String content,
        boolean isAgendaItem,
        Integer agendaOrder,
        Integer agendaDuration
) {}
