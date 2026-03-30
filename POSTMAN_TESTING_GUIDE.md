# Postman Testing Guide — Chat Module
**Base URL:** `http://localhost:8080`

---

## SETUP: Postman Environment

Create a Postman **Environment** called `Chat API` with these variables:

| Variable    | Initial Value                  |
|-------------|-------------------------------|
| `base_url`  | `http://localhost:8080`        |
| `token`     | *(leave empty — auto-filled)*  |
| `roomId`    | *(leave empty — filled later)* |
| `messageId` | *(leave empty — filled later)* |
| `userId`    | *(leave empty — filled later)* |

---

## STEP 1 — AUTHENTICATION

### 1.1 — Login (Get Token)

| Field       | Value                            |
|-------------|----------------------------------|
| **Method**  | `POST`                           |
| **URL**     | `{{base_url}}/api/auth/login`    |
| **Headers** | `Content-Type: application/json` |
| **Auth**    | None (this is the login itself)  |

**Body (raw JSON):**
```json
{
  "email": "manager@test.com",
  "password": "manager123"
}
```

> **Available test accounts:**
>
> | Email                  | Password          | Role          | Can Create Rooms? |
> |------------------------|-------------------|---------------|-------------------|
> | manager@test.com       | manager123        | MANAGER       | YES               |
> | tutor@test.com         | tutor123          | TUTOR         | YES               |
> | employee@test.com      | employee123       | EMPLOYEE      | NO (member only)  |
> | student@test.com       | student123        | STUDENT       | NO (member only)  |
> | admin@test.com         | admin123          | ADMIN         | —                 |
> | superadmin@cmp.com     | superadmin123     | SUPER_ADMIN   | —                 |

**Expected Response (200):**
```json
{
  "token": "3f7a9400-ce5a-4efa-9cc8-90ef7846a1a8",
  "id": 3,
  "email": "manager@test.com",
  "fullName": "Manager User",
  "role": "MANAGER"
}
```

**Auto-save token — add this in the Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("token", res.token);
pm.environment.set("userId", res.id);
console.log("Token saved:", res.token);
```

---

### 1.2 — Get Current User (Verify Token Works)

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `GET`                                             |
| **URL**     | `{{base_url}}/api/auth/me`                        |
| **Headers** | `Authorization: Bearer {{token}}`                 |

**Expected Response (200):**
```json
{
  "token": null,
  "id": 3,
  "email": "manager@test.com",
  "fullName": "Manager User",
  "role": "MANAGER"
}
```

---

### 1.3 — Logout

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `POST`                                            |
| **URL**     | `{{base_url}}/api/auth/logout`                    |
| **Headers** | `Authorization: Bearer {{token}}`                 |

**Expected Response (200):**
```json
{ "message": "Logged out successfully." }
```

> **NOTE:** After logout the token is invalidated. Do step 1.1 again before continuing tests.

---

## HOW TO SET AUTH ON EVERY REQUEST

For **all requests below**, add this header:
```
Authorization: Bearer {{token}}
```
> In Postman you can set this once at the **Collection level** → Authorization tab → Type: `Bearer Token` → Token: `{{token}}`

---

## STEP 2 — CHAT ROOMS (CRUD)

> Requires login as **MANAGER** or **TUTOR**

### 2.1 — Create a Chat Room

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `POST`                                            |
| **URL**     | `{{base_url}}/api/chat/rooms`                     |
| **Headers** | `Content-Type: application/json` + Bearer token   |

**Body (raw JSON):**
```json
{
  "name": "General Discussion",
  "description": "A room for general chat",
  "roomType": "general",
  "projectId": null
}
```

> **roomType options:** `general` · `task_thread` · `deliverable_review` · `private_room` · `meeting`
> **projectId:** UUID string or `null`

**Expected Response (201):**
```json
{
  "id": 1,
  "name": "General Discussion",
  "description": "A room for general chat",
  "roomType": "general",
  "createdById": 3,
  "createdByName": "Manager User",
  "createdAt": "2026-03-30T10:00:00"
}
```

**Auto-save roomId — Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("roomId", res.id);
console.log("Room ID saved:", res.id);
```

---

### 2.2 — List My Rooms (as creator)

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `GET`                                             |
| **URL**     | `{{base_url}}/api/chat/rooms`                     |
| **Headers** | Bearer token                                      |

**Expected Response (200):** Array of rooms you created.

---

### 2.3 — Get a Room by ID

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `GET`                                             |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}`          |
| **Headers** | Bearer token                                      |

---

### 2.4 — Update a Room

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `PUT`                                             |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}`          |
| **Headers** | `Content-Type: application/json` + Bearer token   |

**Body (raw JSON):**
```json
{
  "name": "Updated Room Name",
  "description": "Updated description",
  "roomType": "meeting",
  "projectId": null
}
```

---

### 2.5 — Delete a Room

| Field       | Value                                             |
|-------------|---------------------------------------------------|
| **Method**  | `DELETE`                                          |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}`          |
| **Headers** | Bearer token                                      |

**Expected Response:** `204 No Content`

---

## STEP 3 — ROOM MEMBERS (CRUD)

> The room creator (MANAGER/TUTOR) manages members. Members are EMPLOYEE or STUDENT users.

### 3.1 — Add a Member to a Room

| Field       | Value                                                      |
|-------------|-----------------------------------------------------------|
| **Method**  | `POST`                                                     |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/members`           |
| **Headers** | `Content-Type: application/json` + Bearer token            |

**Body (raw JSON):**
```json
{
  "userId": 10
}
```

> Replace `10` with the actual user ID. To find user IDs:
> - Login as each user and check the `id` in the response
> - employee@test.com → check its ID, employee2@test.com etc.

**Expected Response (201):**
```json
{
  "id": 1,
  "roomId": 1,
  "userId": 10,
  "userName": "FATMA",
  "joinedAt": "2026-03-30T10:05:00"
}
```

---

### 3.2 — List Members of a Room

| Field       | Value                                                             |
|-------------|------------------------------------------------------------------|
| **Method**  | `GET`                                                             |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/members`                  |
| **Headers** | Bearer token                                                      |

**Expected Response (200):** Array of member objects.

---

### 3.3 — Remove a Member from a Room

| Field       | Value                                                                   |
|-------------|------------------------------------------------------------------------|
| **Method**  | `DELETE`                                                                |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/members/{{userId}}`             |
| **Headers** | Bearer token                                                            |

> Replace `{{userId}}` with the numeric user ID to remove.

**Expected Response:** `204 No Content`

---

### 3.4 — Get Rooms I'm a Member Of (as EMPLOYEE/STUDENT)

> Login as employee or student first, then call this.

| Field       | Value                                                |
|-------------|-----------------------------------------------------|
| **Method**  | `GET`                                               |
| **URL**     | `{{base_url}}/api/chat/members/my-rooms`             |
| **Headers** | Bearer token (logged in as employee/student)         |

**Expected Response (200):** Array of rooms this user was added to.

---

## STEP 4 — MESSAGES (CRUD)

### 4.1 — Send a Text Message (via REST/multipart)

| Field       | Value                                                                 |
|-------------|----------------------------------------------------------------------|
| **Method**  | `POST`                                                               |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/upload`             |
| **Headers** | Bearer token *(do NOT set Content-Type — Postman sets it for you)*   |
| **Body**    | `form-data`                                                          |

**form-data fields:**

| Key       | Type | Value                        |
|-----------|------|------------------------------|
| `content` | Text | `Hello, this is a test message!` |
| `file`    | File | *(optional — leave empty for text-only)* |

**Expected Response (201):**
```json
{
  "id": 1,
  "roomId": 1,
  "senderId": 3,
  "senderName": "Manager User",
  "contentText": "Hello, this is a test message!",
  "contentType": "TEXT",
  "createdAt": "2026-03-30T10:10:00",
  "reactions": [],
  "fileName": null,
  "fileUrl": null,
  "fileType": null,
  "fileSize": null,
  "isPinned": false,
  "deleted": false,
  "isEdited": false
}
```

**Auto-save messageId — Tests tab:**
```javascript
const res = pm.response.json();
pm.environment.set("messageId", res.id);
console.log("Message ID saved:", res.id);
```

---

### 4.2 — Send a Message WITH a File Attachment

| Field       | Value                                                                 |
|-------------|----------------------------------------------------------------------|
| **Method**  | `POST`                                                               |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/upload`             |
| **Headers** | Bearer token                                                         |
| **Body**    | `form-data`                                                          |

**form-data fields:**

| Key       | Type | Value                       |
|-----------|------|-----------------------------|
| `content` | Text | `Check this file!`          |
| `file`    | File | *(select any file from your PC)* |

---

### 4.3 — Get Message History of a Room

| Field       | Value                                                             |
|-------------|------------------------------------------------------------------|
| **Method**  | `GET`                                                             |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages`                 |
| **Headers** | Bearer token                                                      |

**Expected Response (200):** Array of MessageDTO objects.

---

### 4.4 — Edit a Message

> Only the sender can edit their own message.

| Field       | Value                                                                          |
|-------------|-------------------------------------------------------------------------------|
| **Method**  | `PUT`                                                                          |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}`                |
| **Headers** | `Content-Type: application/json` + Bearer token                                |

**Body (raw JSON):**
```json
{
  "content": "This message has been edited!"
}
```

**Expected Response (200):** Updated MessageDTO with `isEdited: true` and `editedAt` timestamp.

---

### 4.5 — Delete a Message

> Sender can delete their own. MANAGER/TUTOR can delete any message in their room.

| Field       | Value                                                                          |
|-------------|-------------------------------------------------------------------------------|
| **Method**  | `DELETE`                                                                       |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}`                |
| **Headers** | Bearer token                                                                   |

**Expected Response:** `204 No Content`

---

### 4.6 — Pin a Message

| Field       | Value                                                                               |
|-------------|------------------------------------------------------------------------------------|
| **Method**  | `POST`                                                                              |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}/pin`                 |
| **Headers** | Bearer token                                                                        |

**Expected Response (200):** MessageDTO with `isPinned: true` and `pinnedAt` timestamp.

---

### 4.7 — Unpin a Message

| Field       | Value                                                                               |
|-------------|------------------------------------------------------------------------------------|
| **Method**  | `DELETE`                                                                            |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}/pin`                 |
| **Headers** | Bearer token                                                                        |

---

### 4.8 — Get All Pinned Messages in a Room

| Field       | Value                                                                  |
|-------------|-----------------------------------------------------------------------|
| **Method**  | `GET`                                                                  |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/pinned`               |
| **Headers** | Bearer token                                                           |

---

### 4.9 — Get Shared Media & Files in a Room

> Returns only messages that contain files, images, or links.

| Field       | Value                                                             |
|-------------|------------------------------------------------------------------|
| **Method**  | `GET`                                                             |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/shared`                   |
| **Headers** | Bearer token                                                      |

---

### 4.10 — Download / Stream a File

| Field       | Value                                                             |
|-------------|------------------------------------------------------------------|
| **Method**  | `GET`                                                             |
| **URL**     | `{{base_url}}/api/chat/files/{fileName}`                          |
| **Headers** | None required                                                    |

> Replace `{fileName}` with the `fileUrl` value returned in a message (e.g. `uuid_filename.jpg`).

---

## STEP 5 — MESSAGE REACTIONS

### 5.1 — Toggle an Emoji Reaction (Add / Replace / Remove)

> Calling this twice with the same emoji **removes** it. Calling with a different emoji **replaces** the previous one.

| Field       | Value                                                                                       |
|-------------|--------------------------------------------------------------------------------------------|
| **Method**  | `POST`                                                                                      |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions`                   |
| **Headers** | `Content-Type: application/json` + Bearer token                                             |

**Body (raw JSON):**
```json
{
  "emoji": "👍"
}
```

> Other examples: `"emoji": "❤️"` · `"emoji": "😂"` · `"emoji": "🔥"` · `"emoji": "👎"`

**Expected Response (200):** Updated MessageDTO with the reactions array populated.

---

### 5.2 — List All Reactions on a Message

| Field       | Value                                                                                       |
|-------------|--------------------------------------------------------------------------------------------|
| **Method**  | `GET`                                                                                       |
| **URL**     | `{{base_url}}/api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions`                   |
| **Headers** | Bearer token                                                                                |

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "messageId": 1,
    "userId": 3,
    "userName": "Manager User",
    "emoji": "👍",
    "reactedAt": "2026-03-30T10:20:00"
  }
]
```

---

## FULL TEST FLOW (Recommended Order)

Follow these steps in order for a clean end-to-end test:

```
1.  POST  /api/auth/login                          → save token + userId
2.  GET   /api/auth/me                             → verify token works
3.  POST  /api/chat/rooms                          → create room → save roomId
4.  GET   /api/chat/rooms                          → list my rooms
5.  GET   /api/chat/rooms/{{roomId}}               → get room detail
6.  PUT   /api/chat/rooms/{{roomId}}               → update room
7.  POST  /api/chat/rooms/{{roomId}}/members       → add employee user → save userId
8.  GET   /api/chat/rooms/{{roomId}}/members       → list members
9.  POST  /api/chat/rooms/{{roomId}}/messages/upload  → send text msg → save messageId
10. POST  /api/chat/rooms/{{roomId}}/messages/upload  → send msg with file
11. GET   /api/chat/rooms/{{roomId}}/messages      → get history
12. PUT   /api/chat/rooms/{{roomId}}/messages/{{messageId}}  → edit message
13. POST  /api/chat/rooms/{{roomId}}/messages/{{messageId}}/pin   → pin message
14. GET   /api/chat/rooms/{{roomId}}/messages/pinned → list pinned
15. DELETE /api/chat/rooms/{{roomId}}/messages/{{messageId}}/pin → unpin
16. POST  /api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions  → add 👍
17. POST  /api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions  → add ❤️ (replaces 👍)
18. POST  /api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions  → add ❤️ again (removes it)
19. GET   /api/chat/rooms/{{roomId}}/messages/{{messageId}}/reactions  → list reactions
20. GET   /api/chat/rooms/{{roomId}}/shared        → shared media
21. DELETE /api/chat/rooms/{{roomId}}/messages/{{messageId}} → delete message
22. DELETE /api/chat/rooms/{{roomId}}/members/{{userId}}     → remove member
23. DELETE /api/chat/rooms/{{roomId}}              → delete room
24. POST  /api/auth/logout                         → logout

--- Switch to employee account ---
25. POST  /api/auth/login  (employee@test.com / employee123)
26. GET   /api/chat/members/my-rooms               → rooms I'm added to
```

---

## COMMON ERRORS

| Status | Meaning                                                                 |
|--------|-------------------------------------------------------------------------|
| 401    | Missing or invalid `Authorization: Bearer <token>` header               |
| 403    | Logged in but not allowed (e.g. STUDENT trying to create a room)        |
| 404    | Room or message not found (wrong ID)                                    |
| 400    | Bad request body (missing required field, wrong type)                   |
| 204    | Success for DELETE — no body returned, this is normal                   |
