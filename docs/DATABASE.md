# Database Design

## 1. ER diagram

```
┌──────────────────────┐         ┌───────────────────────┐
│        User          │         │        Project          │
│──────────────────────│         │─────────────────────────│
│ id (PK)              │         │ id (PK)                 │
│ username (uniq)      │         │ name (uniq)             │
│ email (uniq)         │         │ description             │
│ first_name           │         │ status (planning/       │
│ last_name            │         │   active/on_hold/       │
│ role                 │         │   completed)            │
│   admin|manager|     │         │ priority (low/medium/   │
│   employee           │         │   high/critical)        │
│ password             │         │ start_date              │
│ is_active            │         │ due_date                │
│ date_joined          │         │ created_by (FK User) ▸──┼──┐
└─────────┬────────────┘         └──────────┬──────────────┘  │
          │                                │                 │
          │ 1                            N  │             1   │
          │                                ▼                 │
          │                    ┌───────────────────────────┐ │
          │                    │     ProjectMembership       │ │
          │                    │────────────────────────────  │
          │      ┌─────────────│ id (PK)                     │
          │      │             │ project (FK Project) ▸─────┼──┘
          │      │             │ user (FK User)       ▸─────┼──┐
          │      │             │ role_in_project            │ │
          │      │             │   (manager|member)         │ │
          │      │             │ assigned_at                │ │
          │      │             │ unique(project,user)       │ │
          │      │             └───────────────────────────┘ │
          │      │                                           │
          │      │ 1                                        N │
          │      │                                           ▼
          │      │                       ┌───────────────────────────────┐
          │      │                       │            Task               │
          │      │                       │─────────────────────────────── │
          │      └──────────────┐        │ id (PK)                       │
          │                     │        │ project (FK Project) ▸──────┼──┘
          │                     │        │ title                        │
          │                     │        │ description                  │
          │                     │        │ status (todo/in_progress/    │
          │                     │        │   in_review/done)            │
          │                     │        │ priority (low/medium/high/   │
          │                     │        │   critical)                  │
          │                     │        │ due_date                     │
          │                     │        │ estimated_hours (Decimal)    │
          │                     │        │ progress (0..100)            │
          │                     │        │ assigned_to (FK User, nullable)▸─┘
          │                     │        │ attachment (FileField)       │
          │                     │        │ created_by (FK User, nullable)▸
          │                     │        │ completed_at                 │
          │                     │        │ created_at / updated_at      │
          │                     │        └───────────────────────────────┘
          │                     │
          │ 1                   │ 1
          │                     │
          ▼                     ▼
   ┌──────────────────────────────┐
   │        ActivityLog              │
   │───────────────────────────────── │
   │ id (PK)                         │
   │ action (string)                 │
   │ description (text)              │
   │ user (FK User, set_null) ▸───── ┘
   │ project (FK Project, nullable) ▸─
   │ created_at (indexed)            │
   └──────────────────────────────────┘
```

## 2. Models & relationships

| Model | Fields (relevant) | Relationships |
| --- | --- | --- |
| `User` (`accounts.User`, extends `AbstractUser`) | `role` (TextChoices), unique `email` | 1—N `assigned_tasks`, `tasks_created`, 1—N `project_memberships`, 1—N `projects_created`, 1—N `activity_logs` |
| `Project` | name (unique), description, status, priority, start_date, due_date, `created_by` | 1—N `tasks` (cascade), 1—N `memberships` (cascade), N—1 `User` |
| `ProjectMembership` | `role_in_project` (manager|member), `assigned_at`, **unique (project, user)** | N—1 `Project`, N—1 `User` |
| `Task` | title, description, status, priority, due_date, `estimated_hours`, `progress` (0–100 validator), `assigned_to` (nullable), `attachment`, `created_by` (nullable, SET_NULL), timestamps | N—1 `Project` (cascade), N—1 `User` |
| `ActivityLog` | action, description, `created_at` | N—1 `User` (SET_NULL), N—0/1 `Project` (SET_NULL) |

### Cardinality summary

- One **User** can be a member of many projects and can be assigned many tasks.
- One **Project** has many tasks and many members; membership is constrained to
  one row per (project, user).
- Deleting a project cascades to its tasks and memberships (data integrity via
  `on_delete=models.CASCADE`). Tasks/memberships never orphan.
- Deleting a user keeps their history: `assigned_to`/`created_by` set to NULL
  (SET_NULL) instead of deleting the task.

## 3. Indexes & constraints

Defined in the model `Meta` for query performance:

```python
# Project
models.Index(fields=["status"]),
models.Index(fields=["priority"]),
models.Index(fields=["due_date"]),

# Task
models.Index(fields=["project", "status"]),      # project task board
models.Index(fields=["assigned_to", "status"]),  # "my tasks"
models.Index(fields=["due_date"]),               # overdue/deadline scans
models.Index(fields=["priority"]),

# ProjectMembership
models.UniqueConstraint(fields=["project", "user"], name="unique_project_member")
```

- Progress is bounded by a `validate_progress` validator (0–100) plus the
  `PositiveSmallIntegerField` type.
- `Task.save()` enforces status/progress coupling at the model layer: marking
  `done` forces `progress=100` and stamps `completed_at`; any other status resets
  it and caps progress at 99.

## 4. Attachments

- Stored under `media/attachments/{user_id}/{timestamp}_{filename}` via
  `upload_to` (safe basename only).
- Allowed types whitelist: png, jpg, jpeg, gif, pdf, txt, docx, xlsx, csv, md.
- Max size: `MAX_ATTACHMENT_SIZE_MB` (default 5 MB) — enforced in the serializer.

## 5. Why PostgreSQL?

- Clean relational modeling with FK integrity and constraints — the exact fit for
  projects/tasks/memberships.
- `distinct` counts and `Coalesce`/`Avg` aggregates used by the analytics queries
  are well optimized.
- Docker Compose provides a reproducible Postgres instance for development, so
  local behaviour matches production. SQLite is only a zero-setup fallback.

## 6. Migrations

All migrations live in each app under `backend/apps/*/migrations/` and are applied
automatically in Docker (`docker-entrypoint.sh` runs `migrate --noinput`).
To create a new migration after model changes:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```