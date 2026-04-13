package com.example.pi_projet.service;

import com.example.pi_projet.entity.ProjectTemplate;
import com.example.pi_projet.exception.Module2Exception;
import com.example.pi_projet.repository.ProjectTemplateRepository;
import com.example.pi_projet.repository.TemplateFavoriteRepository;
import com.example.pi_projet.repository.TemplateRatingRepository;
import com.example.pi_projet.service.M2AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class ProjectTemplateServiceLineageTest {

    @Mock
    private ProjectTemplateRepository projectTemplateRepository;

    @Mock
    private TemplateRatingRepository templateRatingRepository;

    @Mock
    private TemplateFavoriteRepository templateFavoriteRepository;

    @Mock
    private M2AuditLogService auditLogService;

    @InjectMocks
    private ProjectTemplateService projectTemplateService;

    private UUID rootId;
    private UUID childId;
    private UUID grandchildId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        rootId = UUID.randomUUID();
        childId = UUID.randomUUID();
        grandchildId = UUID.randomUUID();
    }

    @Test
    void testGetLineage_RootOnly() {
        ProjectTemplate root = createTemplate(rootId, null, "Root");
        root.setRating(4.5);
        root.setRatingCount(10);
        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.of(root));
        when(projectTemplateRepository.findByParentTemplateId(rootId)).thenReturn(Collections.emptyList());

        ProjectTemplateService.LineageNode result = projectTemplateService.getLineage(rootId, 3);

        assertNotNull(result);
        assertEquals(rootId, result.id);
        assertEquals("Root", result.name);
        assertEquals(4.5, result.rating);
        assertEquals(10, result.ratingCount);
        assertTrue(result.children.isEmpty());
    }

    @Test
    void testGetLineage_WithChildren() {
        ProjectTemplate root = createTemplate(rootId, null, "Root");
        root.setRating(4.0);
        root.setRatingCount(5);
        ProjectTemplate child = createTemplate(childId, rootId, "Child");
        ProjectTemplate grandchild = createTemplate(grandchildId, childId, "Grandchild");
        child.setRating(3.5);
        child.setRatingCount(2);

        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.of(root));
        when(projectTemplateRepository.findById(childId)).thenReturn(Optional.of(child));
        when(projectTemplateRepository.findById(grandchildId)).thenReturn(Optional.of(grandchild));

        when(projectTemplateRepository.findByParentTemplateId(rootId)).thenReturn(List.of(child));
        when(projectTemplateRepository.findByParentTemplateId(childId)).thenReturn(List.of(grandchild));
        when(projectTemplateRepository.findByParentTemplateId(grandchildId)).thenReturn(Collections.emptyList());

        ProjectTemplateService.LineageNode result = projectTemplateService.getLineage(rootId, 3);

        assertNotNull(result);
        assertEquals(rootId, result.id);
        assertEquals(1, result.children.size());
        assertEquals(childId, result.children.get(0).id);
        assertEquals("Child", result.children.get(0).name);
        assertEquals(1, result.children.get(0).children.size());
        assertEquals(grandchildId, result.children.get(0).children.get(0).id);
    }

    @Test
    void testGetLineage_CycleDetectionDoesNotCrash() {
        ProjectTemplate root = createTemplate(rootId, null, "Root");
        ProjectTemplate child = createTemplate(childId, rootId, "Child");

        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.of(root));
        when(projectTemplateRepository.findById(childId)).thenReturn(Optional.of(child));

        // Corrupted data: child points back to root as a child, creating a loop in descendants.
        when(projectTemplateRepository.findByParentTemplateId(rootId)).thenReturn(List.of(child));
        when(projectTemplateRepository.findByParentTemplateId(childId)).thenReturn(List.of(root));

        ProjectTemplateService.LineageNode result = projectTemplateService.getLineage(rootId, 5);

        assertNotNull(result);
        assertEquals(rootId, result.id);
        assertEquals(1, result.children.size());
        assertEquals(childId, result.children.get(0).id);
        assertTrue(result.children.get(0).children.isEmpty());
    }

    @Test
    void testGetLineage_ClimbsToAncestor() {
        ProjectTemplate root = createTemplate(rootId, null, "Root");
        ProjectTemplate child = createTemplate(childId, rootId, "Child");
        ProjectTemplate grandchild = createTemplate(grandchildId, childId, "Grandchild");

        when(projectTemplateRepository.findById(grandchildId)).thenReturn(Optional.of(grandchild));
        when(projectTemplateRepository.findById(childId)).thenReturn(Optional.of(child));
        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.of(root));

        when(projectTemplateRepository.findByParentTemplateId(rootId)).thenReturn(List.of(child));
        when(projectTemplateRepository.findByParentTemplateId(childId)).thenReturn(List.of(grandchild));
        when(projectTemplateRepository.findByParentTemplateId(grandchildId)).thenReturn(Collections.emptyList());

        ProjectTemplateService.LineageNode result = projectTemplateService.getLineage(grandchildId, 3);

        assertNotNull(result);
        assertEquals(rootId, result.id);
        assertEquals(1, result.children.size());
        assertEquals(childId, result.children.get(0).id);
        assertEquals(grandchildId, result.children.get(0).children.get(0).id);
    }

    @Test
    void testGetLineage_TemplateNotFound() {
        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.empty());

        Module2Exception exception = assertThrows(Module2Exception.class, () -> projectTemplateService.getLineage(rootId, 3));
        assertEquals("Template not found", exception.getMessage());
    }

    @Test
    void testGetLineage_SoftDeletedExcluded() {
        ProjectTemplate root = createTemplate(rootId, null, "Root");
        root.setRating(4.0);
        root.setRatingCount(5);
        ProjectTemplate child = createTemplate(childId, rootId, "Child");
        child.setDeletedAt(Instant.now()); // Soft deleted
        when(projectTemplateRepository.findById(rootId)).thenReturn(Optional.of(root));
        when(projectTemplateRepository.findByParentTemplateId(rootId)).thenReturn(List.of(child));

        ProjectTemplateService.LineageNode result = projectTemplateService.getLineage(rootId, 3);

        assertNotNull(result);
        assertTrue(result.children.isEmpty()); // Child excluded
    }

    private ProjectTemplate createTemplate(UUID id, UUID parentId, String name) {
        ProjectTemplate template = new ProjectTemplate();
        template.setId(id);
        template.setParentTemplateId(parentId);
        template.setName(name);
        template.setCreatedBy(1L);
        template.setUsageCount(0);
        template.setStatus(ProjectTemplate.TemplateStatus.APPROVED);
        template.setCreatedAt(Instant.now());
        return template;
    }
}