package com.example.pi_projet.dto;

import com.example.pi_projet.enums.RoomType;

import java.util.UUID;


// c est le DTO d'entrée (ce que le client envoie)
public record ChatRoomRequest(
        String name,
        String description,
        RoomType roomType,
        UUID projectId
) {}
