package com.example.pi_projet.controller;

import com.example.pi_projet.service.M2DevSeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class M2DevSeedController {

    private final M2DevSeedService m2DevSeedService;

    @PostMapping("/seed")
    public Map<String, Object> seedModule2() {
        return m2DevSeedService.seed();
    }
}
