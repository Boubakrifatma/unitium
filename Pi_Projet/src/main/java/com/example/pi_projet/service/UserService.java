package com.example.pi_projet.service;

import com.example.pi_projet.dto.CreateUserRequest;
import com.example.pi_projet.dto.UpdateUserRequest;
import com.example.pi_projet.dto.UserDTO;
import com.example.pi_projet.entity.User;
import com.example.pi_projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserDTO createUser(CreateUserRequest body) {
        if (userRepository.existsByEmail(body.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use.");
        }
        User user = User.builder()
                .email(body.email())
                .passwordHash(passwordEncoder.encode(body.password()))
                .fullName(body.fullName())
                .role(body.role() != null ? User.RoleName.valueOf(body.role().toUpperCase()) : User.RoleName.EMPLOYEE)
                .isActive(true)
                .build();
        return UserDTO.from(userRepository.save(user));
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserDTO::from)
                .toList();
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        return UserDTO.from(user);
    }

    /** Returns the raw User entity — used by TaskController for assignee lookups. */
    public User getUserByIdForTasks(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }

    public UserDTO updateUser(Long id, UpdateUserRequest body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        if (body.fullName() != null)  user.setFullName(body.fullName());
        if (body.email() != null)     user.setEmail(body.email());
        if (body.avatarUrl() != null) user.setAvatarUrl(body.avatarUrl());

        return UserDTO.from(userRepository.save(user));
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        userRepository.deleteById(id);
    }

    public UserDTO changeRole(Long id, String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        try {
            user.setRole(User.RoleName.valueOf(role.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        }
        return UserDTO.from(userRepository.save(user));
    }

    public List<UserDTO> getUsersByRole(String role) {
        try {
            User.RoleName r = User.RoleName.valueOf(role.toUpperCase());
            return userRepository.findByRole(r).stream().map(UserDTO::from).toList();
        } catch (IllegalArgumentException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid role: " + role);
        }
    }

    public UserDTO changeStatus(Long id, boolean isActive) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user.setIsActive(isActive);
        return UserDTO.from(userRepository.save(user));
    }

    /**
     * Change password — vérifie l'ancien mot de passe avant de mettre à jour.
     * Utilisé par l'admin d'organisation après la première connexion.
     */
    public List<UserDTO> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) return List.of();
        return userRepository.searchByNameOrEmail(query.trim())
                .stream().map(UserDTO::from).toList();
    }

    public UserDTO uploadAvatar(Long id, MultipartFile file) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        try {
            Path dir = Paths.get("uploads/avatars");
            Files.createDirectories(dir);
            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID() + ext;
            Path dest = dir.resolve(filename);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            user.setAvatarUrl("http://localhost:8084/uploads/avatars/" + filename);
            return UserDTO.from(userRepository.save(user));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload avatar.");
        }
    }

    public void changePassword(Long id, String oldPassword, String newPassword) {
        if (oldPassword == null || newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Old password and new password (min 8 chars) are required.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Old password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
