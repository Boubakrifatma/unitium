package com.example.pi_projet.dto.intelligence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A contiguous chunk of diff lines (hunk). Groups nearby changes together
 * so the viewer can display them as a coherent block.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiffSection {

    private int sectionIndex;
    private int oldStartLine;
    private int newStartLine;

    private int addedInSection;
    private int removedInSection;
    private int modifiedInSection;

    private List<DetailedDiffLine> lines;
}
