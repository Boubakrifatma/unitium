package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Free-text comparison input (useful for testing or ad-hoc compares). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompareTextRequest {
    private String oldText;
    private String newText;
}
