package com.example.pi_projet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PiProjetApplication {

    public static void main(String[] args) {
        SpringApplication.run(PiProjetApplication.class, args);
    }

}
