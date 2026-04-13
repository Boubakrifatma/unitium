package com.example.pi_projet.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;


    // les point de connexion
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")  // le client se connecte via ws://localhost:8080/ws
                .setAllowedOriginPatterns("*")  // autorise toutes les origines (CORS)
                .withSockJS();  // fallback si WebSocket non supporté par le navigateur
    }


    //Comment les messages circulent
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic"); // le serveur envoie aux clients via /topic
        registry.setApplicationDestinationPrefixes("/app"); // le client envoie au serveur via /app
    }



    //Vérifie l'authentification à la connexion
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor); //passe par webSocketAuthInterceptor pour vérifier le token JWT de l'utilisateur

    }
}
