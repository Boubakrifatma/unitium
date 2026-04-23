package com.example.pi_projet.service;

import com.example.pi_projet.controller.DeliverableNotificationController;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.Deliverable;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableNotification;
import com.example.pi_projet.entity.PoDecisionAndDelivrable.DeliverableNotification.DeliverableEventType;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.entity.ProjectMember;
import com.example.pi_projet.repository.DeliverableNotificationRepository;
import com.example.pi_projet.repository.DeliverableRepository;
import com.example.pi_projet.repository.ProjectMemberRepository;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final DeliverableNotificationRepository notifRepository;
    private final DeliverableRepository deliverableRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final JavaMailSender mailSender;

    // ─────────────────────────────────────────────────────────────────────────
    // DELIVERABLE WORKFLOW NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 0. Manager ouvre le dialog de review → notifier l'Employé
     */
    public void notifyEmployeeOnManagerViewed(Long deliverableId, Long managerId) {
        Deliverable deliverable = deliverableRepository.findById(deliverableId)
                .orElseThrow(() -> new RuntimeException("Deliverable not found: " + deliverableId));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found: " + managerId));

        User employee = deliverable.getSubmittedBy();
        String title = "Votre livrable est en cours d'examen";
        String message = "Le manager " + manager.getFullName()
                + " examine actuellement votre livrable \""
                + deliverable.getTitle() + "\".";
        persist(employee, deliverable, DeliverableEventType.MANAGER_VIEWED, title, message);
    }

    /**
     * 1. Employé soumet un livrable → notifier tous les Managers
     */
    public void notifyManagersOnSubmission(Deliverable deliverable, User employee) {
        List<User> managers = userRepository.findByRole(User.RoleName.MANAGER);
        if (managers.isEmpty()) {
            log.warn("Aucun manager trouvé pour notifier la soumission du livrable #{}", deliverable.getId());
            return;
        }
        String title = "Nouveau livrable à examiner";
        String message = "L'employé " + employee.getFullName()
                + " a soumis le livrable \"" + deliverable.getTitle() + "\"."
                + " Veuillez le réviser.";
        managers.forEach(manager -> persist(manager, deliverable, DeliverableEventType.SUBMITTED_TO_MANAGER, title, message));
    }

    /**
     * 2. Manager accepte (score ≥ 7) → notifier tous les Product Owners + l'Employé
     */
    public void notifyPOsOnManagerAccepted(Deliverable deliverable, User manager) {
        // Notifier uniquement les POs qui sont OBSERVERS de ce projet
        List<User> pos = projectMemberRepository
                .findUsersByProjectIdAndRole(deliverable.getProject().getId(), ProjectMember.ProjectRole.OBSERVER)
                .stream()
                .filter(u -> u.getRole() == User.RoleName.PRODUCT_OWNER)
                .toList();
        if (pos.isEmpty()) {
            log.warn("Aucun PO (OBSERVER) trouvé pour le projet {} — livrable #{}",
                    deliverable.getProject().getId(), deliverable.getId());
        } else {
            String titlePO = "Livrable prêt pour validation PO";
            String messagePO = "Le manager " + manager.getFullName()
                    + " a accepté le livrable \"" + deliverable.getTitle() + "\"."
                    + " Il attend votre décision finale.";
            pos.forEach(po -> persist(po, deliverable, DeliverableEventType.ACCEPTED_BY_MANAGER, titlePO, messagePO));
        }

        // Notifier aussi l'Employé
        User employee = deliverable.getSubmittedBy();
        String titleEmp = "Votre livrable a été accepté par le Manager";
        String messageEmp = "Le manager " + manager.getFullName()
                + " a accepté votre livrable \"" + deliverable.getTitle() + "\"."
                + " Il est maintenant en attente de validation par le Product Owner.";
        persist(employee, deliverable, DeliverableEventType.ACCEPTED_BY_MANAGER, titleEmp, messageEmp);
    }

    /**
     * 3. Manager refuse (score < 7) → notifier l'Employé
     */
    public void notifyEmployeeOnRevisionRequired(Deliverable deliverable, User manager, String feedback) {
        User employee = deliverable.getSubmittedBy();
        String title = "Révision requise sur votre livrable";
        String message = "Le manager " + manager.getFullName()
                + " a demandé une révision du livrable \"" + deliverable.getTitle() + "\"."
                + " Feedback : " + feedback;
        persist(employee, deliverable, DeliverableEventType.REVISION_REQUIRED_BY_MANAGER, title, message);
    }

    /**
     * 4. PO accepte → notifier le Manager (+ suggestion de réunion)
     */
    public void notifyManagerOnPOValidated(Deliverable deliverable, User po, User manager) {
        String title = "Livrable validé par le PO — Réunion recommandée";
        String message = "Le Product Owner " + po.getFullName()
                + " a validé le livrable \"" + deliverable.getTitle() + "\"."
                + " Il est recommandé d'organiser une réunion avec l'équipe pour présenter les résultats.";
        persist(manager, deliverable, DeliverableEventType.VALIDATED_BY_PO, title, message);
    }

    /**
     * 4b. PO accepte → notifier l'Employé
     */
    public void notifyEmployeeOnPOValidated(Deliverable deliverable, User po) {
        User employee = deliverable.getSubmittedBy();
        String title = "Votre livrable a été validé !";
        String message = "Le Product Owner " + po.getFullName()
                + " a validé votre livrable \"" + deliverable.getTitle() + "\".";
        persist(employee, deliverable, DeliverableEventType.VALIDATED_EMPLOYEE, title, message);
    }

    /**
     * 5. PO refuse → notifier le Manager
     */
    public void notifyManagerOnPORejected(Deliverable deliverable, User po, User manager, String feedback) {
        String title = "Livrable rejeté par le PO";
        String message = "Le Product Owner " + po.getFullName()
                + " a rejeté le livrable \"" + deliverable.getTitle() + "\"."
                + " Feedback : " + feedback;
        persist(manager, deliverable, DeliverableEventType.REJECTED_BY_PO, title, message);
    }

    /**
     * 5b. PO demande révision → notifier l'Employé
     */
    public void notifyEmployeeOnPORevision(Deliverable deliverable, User po, String feedback) {
        User employee = deliverable.getSubmittedBy();
        String title = "Révision demandée par le Product Owner";
        String message = "Le Product Owner " + po.getFullName()
                + " a demandé une révision du livrable \"" + deliverable.getTitle() + "\"."
                + " Feedback : " + feedback;
        persist(employee, deliverable, DeliverableEventType.REVISION_REQUIRED_BY_PO, title, message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QUERY
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<java.util.Map<String, Object>> getNotificationsForUser(Long userId) {
        return notifRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public List<java.util.Map<String, Object>> getUnreadNotificationsForUser(Long userId) {
        return notifRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).collect(java.util.stream.Collectors.toList());
    }

    public java.util.Map<String, Object> toDto(DeliverableNotification n) {
        java.util.LinkedHashMap<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", n.getId());
        map.put("title", n.getTitle());
        map.put("message", n.getMessage());
        map.put("eventType", n.getEventType().name());
        map.put("deliverableId", n.getDeliverable() != null ? n.getDeliverable().getId() : null);
        map.put("createdAt", n.getCreatedAt().toString());
        map.put("isRead", Boolean.TRUE.equals(n.getIsRead()));
        return map;
    }

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public long countUnread(Long userId) {
        return notifRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notifRepository.markAsRead(notificationId);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notifRepository.markAllAsReadForUser(userId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTERNAL — save to DB + send email + push SSE
    // ─────────────────────────────────────────────────────────────────────────

    private void persist(User recipient, Deliverable deliverable,
                         DeliverableEventType eventType, String title, String message) {
        try {
            // 1. Save in DB
            DeliverableNotification saved = notifRepository.save(
                    DeliverableNotification.builder()
                            .recipient(recipient)
                            .deliverable(deliverable)
                            .eventType(eventType)
                            .title(title)
                            .message(message)
                            .isRead(false)
                            .build());

            // 2. Send email
            sendEmail(recipient.getEmail(), title, message);

            // 3. Push SSE (real-time in-app)
            DeliverableNotificationController.push(recipient.getId(), saved);

            log.info("Notification envoyée à {} — {}", recipient.getEmail(), title);

        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de la notification à {} : {}", recipient.getEmail(), e.getMessage());
        }
    }

    private void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom("riahieya028028@gmail.com");
            mail.setTo(to);
            mail.setSubject("[Unitum] " + subject);
            mail.setText(body);
            mailSender.send(mail);
            log.info("Email envoyé à {}", to);
        } catch (Exception e) {
            log.error("Echec envoi email à {} : {}", to, e.getMessage());
        }
    }
}
