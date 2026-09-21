# API Reference

Base URL: `/api` (mounted at `http://localhost:8000/api` locally, or
`http://localhost/api` behind the nginx frontend in Docker).

Interactive docs: **Swagger UI** at `GET /api/docs/`, OpenAPI schema at
`GET /api/schema/`.

## 1. Conventions

- **Authentication**: only `Authorization: Bearer <access_token>` is accepted.
  Access tokens expire after 30 minutes (configurable); refresh tokens after 7
  days and are rotated + blacklisted.
- **Content type**: `application/json` for all requests except task create/update
  which accept `multipart/form-data` (for file attachments).
- **Pagination**: every list endpoint returns
  `{ "count", "next", "previous", "results" }`. Query params `page` (1-based)
  and `page_size` (1–100, default 20).
- **Filtering**: `django-filter` params per resource (below). **Search**: `search=`
  keyword over the resource's `search_fields`.
- **Ordering**: `ordering=-created_at` etc., resource-specific.

### Error envelope

```json
{ "type": "validation_error", "detail": { "username": ["Invalid credentials."] } }
```

| `type` | Meaning |
| --- | --- |
| `validation_error` | 400 — serializer / field validation |
| `authentication_error` | 401 — missing/invalid/expired credentials |
| `permission_denied` | 403 — authenticated but not allowed |
| `not_found` | 404 |
| `method_not_allowed` | 405 |
| `internal_error` | 500 — never leaks stack traces |

### HTTP status codes used

`200` OK · `201` Created · `204` No Content · `400` Bad Request ·
`401` Unauthorized · `403` Forbidden · `404` Not Found · `405` Method Not Allowed ·
`429` Too Many Requests.

### Throttling

Anonymous requests: 60/hour (register, login). Authenticated: 1000/hour.

---

## 2. Authentication (`/api/auth/`)

### POST `/auth/register/` — create account (public)

Body:

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "first_name": "New",
  "last_name": "User",
  "password": "StrongPass123!",
  "password2": "StrongPass123!"
}
```

→ `201` returns `{ "user": {...}, "access": "<jwt>", "refresh": "<jwt>" }`.
All registrations create an **Employee** account (roles are granted by an admin).

### POST `/auth/login/` — get tokens (public)

Body: `{ "username", "password" }` → `200` returns user + `access`/`refresh`.

### POST `/auth/refresh/` — rotate tokens

Body: `{ "refresh": "<jwt>" }` → `200` returns `{ "access": "<new jwk>" }`
(refresh token is rotated when `ROTATE_REFRESH_TOKENS` is enabled).

### POST `/auth/logout/` — revoke session

Authenticated. Body: `{ "refresh": "<jwt>" }` → `204`. The refresh token is
blacklisted.

### GET `/auth/me/` — current profile

Authenticated → `200` user object. Also `PATCH` to update `first_name`,
`last_name`, `email`, `password`.

#### User object shape

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "first_name": "Ada",
  "last_name": "Admin",
  "full_name": "Ada Admin",
  "role": "admin",
  "is_active": true,
  "date_joined": "2026-09-01T10:00:00Z"
}
```

---

## 3. User management (`/api/auth/users/`) — Admin only

| Method | Path | Description |
| --- | --- | --- |
| GET | `/auth/users/` | Paginated, searchable list `(search=, ordering=)` |
| POST | `/auth/users/` | Create user. Body: `{username, email, first_name, last_name, role, is_active, password}` |
| GET | `/auth/users/{id}/` | Detail |
| PATCH | `/auth/users/{id}/` | Update fields / role / is_active / password |
| DELETE | `/auth/users/{id}/` | Delete (cannot delete yourself) |
| GET | `/auth/users/active/` | Active users for assignee dropdowns (any authenticated user) |

---

## 4. Projects (`/api/projects/`)

Permissions: **read** — all authenticated; **write** — admin/manager.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/projects/` | List (paginated) |
| POST | `/projects/` | Create |
| GET | `/projects/{id}/` | Detail |
| PATCH | `/projects/{id}/` | Partial update |
| DELETE | `/projects/{id}/` | Delete (cascades tasks/memberships) |
| GET | `/projects/{id}/members/` | List members |
| POST | `/projects/{id}/members/` | Add member: `{ "user_id": 5, "role_in_project": "member" }` |
| DELETE | `/projects/{id}/members/{user_id}/` | Remove member |

### Filters (list)

`status` (`planning|active|on_hold|completed`), `priority` (`low|medium|high|critical`),
`member` (user id), `due_before`, `due_after`. `search=` over name/description.

### Project object shape

```json
{
  "id": 1,
  "name": "Mobile App Release",
  "description": "Ship v1 to stores.",
  "status": "active",
  "priority": "high",
  "start_date": "2026-09-01",
  "due_date": "2026-12-01",
  "progress": 45.5,
  "is_overdue": false,
  "task_count": 11,
  "done_task_count": 5,
  "members": [
    { "id": 1, "project": 1, "user": { "...user object..." },
      "role_in_project": "manager", "assigned_at": "2026-09-01T09:00:00Z" }
  ],
  "created_by": 1,
  "created_by_name": "admin",
  "created_at": "2026-09-01T09:00:00Z",
  "updated_at": "2026-09-02T09:00:00Z"
}
```

Validation: `due_date` must be ≥ `start_date`; `name` unique.

---

## 5. Tasks (`/api/tasks/`)

Permissions: **read** — all authenticated; **create/delete** — admin/manager;
**PATCH** — admin/manager, or an employee only on tasks `assigned_to` them.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/tasks/` | List (paginated, filterable) |
| POST | `/tasks/` | Create (`application/json` or `multipart/form-data`) |
| GET | `/tasks/{id}/` | Detail |
| PATCH | `/tasks/{id}/` | Partial update (status/progress for assigned employees) |
| DELETE | `/tasks/{id}/` | Delete (admin/manager) |

### Filters

`status` (`todo|in_progress|in_review|done`), `priority`
(`low|medium|high|critical`), `project` (id), `assigned_to` (id), `due_before`,
`due_after`. `search=` over title/description.

### Task object shape

```json
{
  "id": 12,
  "project": 1,
  "project_name": "Mobile App Release",
  "title": "Implement login screen",
  "description": "Email + password form with error handling.",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2026-10-15",
  "estimated_hours": "8.0",
  "progress": 50,
  "assigned_to": 3,
  "assigned_to_name": "Alice Andrews",
  "attachment": null,
  "attachment_url": null,
  "created_by": 1,
  "created_by_name": "admin",
  "completed_at": null,
  "created_at": "2026-09-10T08:00:00Z",
  "updated_at": "2026-09-12T10:00:00Z",
  "is_overdue": false
}
```

Validation rules:

- `progress` between 0 and 100.
- A task cannot be marked `done` before `progress` reaches 100.
- The `assigned_to` user must be a member of the task's project.
- `attachment` must match the type whitelist and be ≤ 5 MB.
- `estimated_hours` cannot be negative.

Workflow side-effects (model-level):

- `status = done` → `progress = 100`, `completed_at` set.
- `status ≠ done` → `completed_at` cleared, `progress` capped at 99.

---

## 6. Dashboard (`/api/dashboard/summary/`)

Authenticated. Cached in Redis for `CACHE_TTL_SECONDS` (default 60) **per user**.

```json
{
  "projects": {
    "total": 3,
    "by_status": { "planning": 0, "active": 2, "on_hold": 0, "completed": 1 }
  },
  "tasks": {
    "total": 8,
    "by_status": { "todo": 2, "in_progress": 3, "in_review": 1, "done": 2 },
    "overdue": 3,
    "completed_last_7_days": 1
  },
  "overdue_projects": 1,
  "members": 5,
  "upcoming_deadlines": [
    { "id": 9, "title": "Write release notes", "due_date": "2026-09-20", "status": "todo" }
  ],
  "recent_activity": [
    { "id": 42, "action": "task_completed", "description": "Task 'X': status → Done",
      "created_at": "2026-09-19T12:00:00Z", "user__username": "manager" }
  ]
}
```

---

## 7. Reports (`/api/reports/`) — Admin/Manager only

### GET `/reports/tasks/?days=N` (1–365, default 30)

Cached in Redis for the TTL. Returns:

```json
{
  "period_days": 30,
  "completed_tasks": 5,
  "overdue_tasks": 3,
  "overdue_task_ids": [9, 14, 21],
  "completion_rate_by_priority": { "low": 50.0, "medium": 33.3, "high": 25.0, "critical": 0.0 },
  "avg_progress_by_status": { "todo": 0.0, "in_progress": 55.0, "in_review": 80.0, "done": 100.0 }
}
```

### GET `/reports/project-progress/`

Cached. Returns an array of per-project rows:

```json
[
  {
    "id": 1,
    "name": "Mobile App Release",
    "status": "active",
    "progress": 45.5,
    "task_count": 11,
    "done_task_count": 5,
    "overdue_tasks": 2,
    "overdue": false,
    "due_date": "2026-12-01",
    "member_count": 4
  }
]
```

---

## 8. Worked examples

### Login then list your tasks

```
POST /api/auth/login/
{"username": "admin", "password": "DemoPass123!"}

# 200
# { "access": "eyJ...", "refresh": "eyJ...", "user": {...} }
```

```
GET /api/tasks/?status=in_progress&page_size=50
Authorization: Bearer eyJ...

# 200
# { "count": 3, "next": null, "previous": null, "results": [ ... ] }
```

### Employee updates a task assigned to them

```
PATCH /api/tasks/12/
Authorization: Bearer eyJ...

{"status": "in_review", "progress": 90}

# 200 task with updated fields
```

### Employee tries to create a task → 403

```
POST /api/tasks/
Authorization: Bearer eyJ...

{"project": 1, "title": "X"}

# 403
# { "type": "permission_denied", "detail": "Admin or manager role required to modify this resource." }
```

---

## 9. Attachments

- `PATCH/POST /tasks/` with `multipart/form-data` and a file field named
  `attachment`.
- Uploaded files are stored under `media/attachments/...`; the API returns an
  absolute `attachment_url` for direct download.
- Rejected types/sizes are reported as `validation_error` details.
