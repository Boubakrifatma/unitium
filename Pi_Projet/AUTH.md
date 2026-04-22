# Authentication & Session Guide

> Read this before building any protected endpoint.

---

## How it works

1. The client calls `POST /api/auth/login` with email + password.
2. The server creates a **Session** record in the database and returns a **token** (UUID).
3. The client stores the token and sends it in every request:
   ```
   Authorization: Bearer <token>
   ```
4. The server validates the token on every request via `SessionInterceptor`.
5. The session expires after **8 hours**.

---

## The `@Authorized` annotation

`@Authorized` does two things at once:
- **Enforces** authentication → the `SessionInterceptor` rejects the request with `401` if the token is missing or expired.
- **Documents** the endpoint in Swagger UI → shows the 🔒 lock icon so colleagues know a token is required.

### Where it is defined
```
src/main/java/com/example/pi_projet/annotation/Authorized.java
```

---

## How to protect your endpoint

### 1. Protect a single method
```java
import com.example.pi_projet.annotation.Authorized;

@Authorized                          // 🔒 requires valid session token
@GetMapping("/my-endpoint")
public ResponseEntity<?> myEndpoint(HttpServletRequest request) {

    // Get the authenticated user anywhere in your method:
    User currentUser = (User) request.getAttribute("currentUser");

    return ResponseEntity.ok(currentUser.getEmail());
}
```

### 2. Protect an entire controller
```java
@Authorized                          // 🔒 applies to ALL methods in this controller
@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    // every method here requires a valid token
}
```

---

## Getting the current user

The `SessionInterceptor` automatically resolves the token and puts the `User` object
in the request attributes. Just cast it:

```java
User currentUser = (User) request.getAttribute("currentUser");
Long userId      = currentUser.getId();
String email     = currentUser.getEmail();
String role      = currentUser.getRole().name(); // ADMIN, MANAGER, EMPLOYEE...
```

---

## Public vs Protected endpoints

| Endpoint                  | Protected | Notes                          |
|---------------------------|-----------|--------------------------------|
| `POST /api/auth/login`    | ❌ No     | Returns the token              |
| `POST /api/auth/logout`   | ✅ Yes    | Invalidates the token          |
| `GET  /api/auth/me`       | ✅ Yes    | Returns the current user       |
| `POST /api/your-endpoint` | ✅ Yes    | Add `@Authorized` to protect   |

To make an endpoint **public**, simply do **not** add `@Authorized`.
The `WebConfig` already excludes `/api/auth/login` from the interceptor.

---

## Testing with Swagger UI

1. Start the backend: `mvn spring-boot:run`
2. Open: [http://localhost:8084/swagger-ui.html](http://localhost:8084/swagger-ui.html)
3. Call `POST /api/auth/login` → copy the `token` from the response.
4. Click **Authorize** (top right of Swagger UI).
5. Enter: `Bearer <your-token>` → click **Authorize**.
6. All 🔒 endpoints are now unlocked for testing.

---

## Testing with curl

```bash
# 1. Login — get token
curl -X POST http://localhost:8084/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Response:
# { "token": "abc-123-...", "id": 1, "email": "admin@test.com", "role": "ADMIN" }

# 2. Use the token on a protected endpoint
curl http://localhost:8084/api/auth/me \
  -H "Authorization: Bearer abc-123-..."
```

---

## What happens if the token is missing or expired?

The server returns:
```json
HTTP 401 Unauthorized
{ "message": "Invalid or expired session." }
```

The Angular frontend handles this automatically via `auth.interceptor.ts`:
it redirects the user to `/auth/login`.

---

## Session entity (database)

Each login creates a row in the `sessions` table:

| Column          | Description                              |
|-----------------|------------------------------------------|
| `token_hash`    | The token sent in the Authorization header |
| `user_id`       | The authenticated user                   |
| `is_active`     | `false` after logout                     |
| `expires_at`    | 8 hours after login                      |
| `ip_address`    | Client IP                                |
| `user_agent`    | Client browser/device                    |

---

## Files involved

| File | Role |
|------|------|
| `annotation/Authorized.java`       | The `@Authorized` annotation |
| `config/SessionInterceptor.java`   | Validates token on every request |
| `config/WebConfig.java`            | Registers the interceptor, excludes `/api/auth/login` |
| `service/AuthService.java`         | Login / logout / token validation logic |
| `repository/SessionRepository.java`| Database access for sessions |
| `config/SwaggerConfig.java`        | Swagger UI + security scheme setup |
