package com.example.pi_projet.scheduler;

import com.example.pi_projet.service.ScheduledMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ScheduledMessageScheduler {

    private final ScheduledMessageService scheduledMessageService;

    @Scheduled(fixedDelay = 60000)
    public void processScheduledMessages() {
        scheduledMessageService.processScheduledMessages();
    }

    @Scheduled(fixedDelay = 60000)
    public void processReminders() {
        scheduledMessageService.process15MinReminders();
    }
}
