package com.example.pi_projet.repository;

import com.example.pi_projet.entity.GitRepoLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GitRepoLinkRepository extends JpaRepository<GitRepoLink, Long> {
    List<GitRepoLink> findByProjectId(Long projectId);
    List<GitRepoLink> findByLinkedByUserId(Long userId);
    Optional<GitRepoLink> findByProjectIdAndOwnerAndRepoName(Long projectId, String owner, String repoName);
}
