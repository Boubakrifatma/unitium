package com.example.pi_projet.repository;

import com.example.pi_projet.entity.Message;
import com.example.pi_projet.entity.MessageReaction;
import com.example.pi_projet.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    List<MessageReaction> findByMessage(Message message);

    Optional<MessageReaction> findByMessageAndUser(Message message, User user);

    @Transactional
    void deleteByMessageAndUser(Message message, User user);
}
