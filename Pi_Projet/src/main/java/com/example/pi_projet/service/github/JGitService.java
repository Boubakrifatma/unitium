package com.example.pi_projet.service.github;

import com.example.pi_projet.entity.GitRepoLink;
import com.example.pi_projet.repository.GitRepoLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.PullResult;
import org.eclipse.jgit.api.Status;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.lib.Ref;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.transport.PushResult;
import org.eclipse.jgit.transport.RemoteRefUpdate;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

/**
 * Wraps JGit for commit / push / pull / history on a locally cloned repo.
 * The repo is identified by a GitRepoLink (which holds the local path).
 *
 * Push/pull use the user's GitHub PAT as the password, with the GitHub login
 * as the username — the standard HTTPS auth scheme for GitHub.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JGitService {

    private final GitRepoLinkRepository linkRepo;
    private final GithubCredentialService credentials;

    public GitRepoLink getLink(Long linkId) {
        return linkRepo.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown repo link " + linkId));
    }

    private File requireLocalPath(GitRepoLink link) {
        if (link.getLocalPath() == null || link.getLocalPath().isBlank()) {
            throw new IllegalStateException("Repo " + link.fullName() + " has no local path configured.");
        }
        File f = new File(link.getLocalPath());
        if (!f.isDirectory()) {
            throw new IllegalStateException("Local path does not exist: " + f);
        }
        return f;
    }

    private Git open(GitRepoLink link) throws IOException {
        return Git.open(requireLocalPath(link));
    }

    public Map<String, Object> status(Long linkId) {
        GitRepoLink link = getLink(linkId);
        try (Git git = open(link)) {
            Status s = git.status().call();
            Repository repo = git.getRepository();
            String branch = repo.getBranch();
            return Map.of(
                    "branch", branch,
                    "added", s.getAdded(),
                    "changed", s.getChanged(),
                    "modified", s.getModified(),
                    "untracked", s.getUntracked(),
                    "removed", s.getRemoved(),
                    "missing", s.getMissing(),
                    "clean", s.isClean()
            );
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Failed to read status: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> commit(Long linkId, Long userId, String message,
                                      String authorName, String authorEmail, boolean stageAll) {
        GitRepoLink link = getLink(linkId);
        try (Git git = open(link)) {
            if (stageAll) {
                git.add().addFilepattern(".").call();
                git.add().setUpdate(true).addFilepattern(".").call(); // stage deletions
            }
            PersonIdent author = new PersonIdent(
                    authorName != null ? authorName : "Unitum User",
                    authorEmail != null ? authorEmail : "unitum@local"
            );
            RevCommit c = git.commit().setMessage(message).setAuthor(author).setCommitter(author).call();
            return Map.of(
                    "sha", c.getName(),
                    "shortSha", c.getName().substring(0, 7),
                    "message", c.getFullMessage().trim(),
                    "author", c.getAuthorIdent().getName(),
                    "email", c.getAuthorIdent().getEmailAddress(),
                    "date", Instant.ofEpochSecond(c.getCommitTime()).toString()
            );
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Commit failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> push(Long linkId, Long userId) {
        GitRepoLink link = getLink(linkId);
        String token = credentials.getRawToken(userId);
        String login = credentials.getCredential(userId).map(c -> c.getGithubLogin()).orElse("git");
        try (Git git = open(link)) {
            Iterable<PushResult> results = git.push()
                    .setCredentialsProvider(new UsernamePasswordCredentialsProvider(login, token))
                    .call();
            List<String> updates = new ArrayList<>();
            for (PushResult r : results) {
                for (RemoteRefUpdate u : r.getRemoteUpdates()) {
                    updates.add(u.getRemoteName() + " → " + u.getStatus());
                }
            }
            return Map.of("updates", updates);
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Push failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> pull(Long linkId, Long userId) {
        GitRepoLink link = getLink(linkId);
        String token = credentials.getRawToken(userId);
        String login = credentials.getCredential(userId).map(c -> c.getGithubLogin()).orElse("git");
        try (Git git = open(link)) {
            PullResult r = git.pull()
                    .setCredentialsProvider(new UsernamePasswordCredentialsProvider(login, token))
                    .call();
            return Map.of(
                    "successful", r.isSuccessful(),
                    "fetchedFrom", String.valueOf(r.getFetchedFrom()),
                    "mergeStatus", r.getMergeResult() != null ? r.getMergeResult().getMergeStatus().name() : "rebase",
                    "rebaseStatus", r.getRebaseResult() != null ? r.getRebaseResult().getStatus().name() : null
            );
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Pull failed: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> history(Long linkId, int limit) {
        GitRepoLink link = getLink(linkId);
        try (Git git = open(link)) {
            List<Map<String, Object>> out = new ArrayList<>();
            int n = 0;
            for (RevCommit c : git.log().setMaxCount(limit).call()) {
                if (++n > limit) break;
                out.add(Map.of(
                        "sha", c.getName(),
                        "shortSha", c.getName().substring(0, 7),
                        "message", c.getFullMessage().trim(),
                        "author", c.getAuthorIdent().getName(),
                        "email", c.getAuthorIdent().getEmailAddress(),
                        "date", Instant.ofEpochSecond(c.getCommitTime()).toString()
                ));
            }
            return out;
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Failed to read history: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> branches(Long linkId) {
        GitRepoLink link = getLink(linkId);
        try (Git git = open(link)) {
            List<String> branches = new ArrayList<>();
            for (Ref ref : git.branchList().call()) {
                branches.add(ref.getName().replaceFirst("^refs/heads/", ""));
            }
            return Map.of(
                    "current", git.getRepository().getBranch(),
                    "local", branches
            );
        } catch (IOException | GitAPIException e) {
            throw new IllegalStateException("Failed to list branches: " + e.getMessage(), e);
        }
    }
}
