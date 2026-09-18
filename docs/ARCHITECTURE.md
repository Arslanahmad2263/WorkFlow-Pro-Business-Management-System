# Architecture

## 1. Overview

WorkFlow-Pro is a two-tier web application with a **REST API backend** (Django +
DRF) and a **single-page frontend** (React), wired together over JSON over HTTP.
PostgreSQL is the primary datastore; Redis caches read-heavy analytics payloads.
JWT tokens provide stateless authentication, and a small role matrix implements
access control server-side.

```
                          ┌──────────────────────────────┐
                          │        Browser               │
                          │  React 18 + Vite + Tailwind  │
                          └──────────────┬───────────────┘
                                         │  HTTPS / HTTP
                          ┌──────────────▼───────────────┐
                          │        nginx (frontend)      │
                          │  static SPA + /api proxy      │
                          └──────────────┬───────────────┘
                                         │ /api/*
                          ┌──────────────▼───────────────┐
                          │      Gunicorn                │
                          │ Django + DRF (backend)        │
                          │  apps: accounts · projects    │
                          │        tasks · activity       │
                          │        analytics · core       │
                          └────┬──────────────┬──────────┘
                               │              │
                     ┌─────────▼────┐   ┌─────▼─────────┐
                     │  PostgreSQL  │   │  Redis        │
                     │  relational  │   │  analytics    │
                     │  data        │   │  cache        │
                     └──────────────┘   └───────────────┘
```

## 2. Backend

### 2.1 Django apps (separation of concerns)

| App | Responsibility |
| --- | --- |
| `accounts` | Custom `User` model (`role` on the user), JWT auth endpoints, RBAC permission classes, admin-only user management |
| `projects` | `Project` + `ProjectMembership`, viewset CRUD, membership add/remove, `django-filter` filtering |
| `tasks` | `Task` model, viewset CRUD with granular object-level permissions, filters, attachment validation |
| `activity` | `ActivityLog` model + `record_activity()` service used as an audit trail |
| `analytics` | Read-only, pure service functions + cached views for dashboard and reports |
| `core` | Shared plumbing: pagination, global exception handler |

### 2.2 Request lifecycle

1. **JWT authentication** (`SimpleJWT`): every request except `register` / `login` /
   schema requires a valid `Authorization: Bearer <access>` header. The access
   token carries `user_id`; the refresh endpoint rotates tokens and supports
   blacklisting.
2. **RBAC permissions**:
   - `IsAdmin` — admin only (user management).
   - `IsManager` — admin + manager (reports).
   - `IsAdminOrManager` — write actions only for admin/manager; read for all
     authenticated users (projects, memberships).
   - Task viewset adds **object-level** logic: employees may `PATCH` only tasks
     assigned to them, and may never create/delete tasks.
3. **Serializers** validate business rules (dates order, status/progress coupling,
   assignee must be a project member, attachment size/type whitelist, unique
   names).
4. **Views** call the ORM; `analytics` views read cached or freshly computed
   aggregates from pure service functions.
5. **Errors** flow through the global exception handler which maps every failure
   to a consistent JSON envelope (see below).

### 2.3 Error envelope

All errors are returned as JSON with a stable shape so the frontend can react:

```json
{ "type": "validation_error", "detail": { "username": ["This field is required."] } }
```

Supported `type` values: `validation_error`, `authentication_error`,
`permission_denied`, `not_found`, `method_not_allowed`, `internal_error`,
plus a passthrough for SimpleJWT `error` codes (`invalid_token`, etc.).

### 2.4 Pagination, filtering, search

- All list endpoints use `PageNumberPagination` returning
  `{ count, next, previous, results }`; `page` and `page_size` (max 100) params.
- Filtering via `django-filter` (status, priority, project, assignee, due dates).
- Free-text search via DRF `SearchFilter` on `search` param.

## 3. Frontend

### 3.1 Structure

- **`lib/types`** — one TypeScript contract mirroring the API (single source of truth).
- **`lib/api`** — Axios instance with request (attach token) and response
  (401 → refresh once → retry; otherwise dispatch `auth:expired`) interceptors.
- **`contexts/AuthContext`** — session state, login/register/logout, role helpers.
- **`hooks/api`** — TanStack Query hooks with typed query/mutation functions and
  cache invalidation on writes.
- **`components`** — presentational kit (buttons, cards, modals, tables, badges)
  and domain components (project/task forms, activity feed, status bars).
- **`pages`** — route-level screens including loading, empty and error states.

### 3.2 Data flow

React Query caches read models; mutations optimistically invalidate dependent
queries (e.g. creating a task refreshes tasks, project detail and dashboard).
Role-based navigation is derived from `useRole()` so employees do not see
write-only screens. Token refresh is handled transparently by the interceptor —
the UI never manages tokens manually.

## 4. Why these technologies?

| Choice | Rationale |
| --- | --- |
| Django + DRF | Batteries-included ORM, migrations, admin, security; DRF gives production-grade serializers/viewsets, filtering and auth plumbing — ideal for a CRUD-heavy business app with tight deadlines. |
| PostgreSQL | Full-featured relational engine; JSON, transactions, mature indexing. Compose image gives reproducible local prod parity. |
| Redis | Sub-millisecond reads for the dashboard/report payloads; `IGNORE_EXCEPTIONS=True` keeps the API available when Redis is down. |
| JWT (SimpleJWT) | Stateless auth that fits the SPA; refresh rotation + blacklist for logout. |
| React + React Query | Declarative, cached data layer and automatic background invalidation reduce client complexity. |
| Vite + TypeScript | Fast dev/build and type-checked API contracts (@ types mirror the backend). |
| Docker Compose | One-command environment (db+redis+api+web) identical to production. |

## 5. Deployment topology

- **Docker Compose** (local / single-host): nginx container exposes the app on
  port 80 and proxies `/api/`, `/static/` and `/media/` to Gunicorn; Postgres and
  Redis are internal services.
- **Production consideration**: swap volume storage for managed Postgres/Redis,
  terminate TLS at a load balancer, set `DEBUG=False`, rotate `SECRET_KEY`
  periodically, restrict `ALLOWED_HOSTS`, run Gunicorn behind nginx and add
  object storage for attachments if they grow.

## 6. Known design decisions

- **No Celery**: the requirements explicitly exclude task queues; Redis is used
  only as a cache.
- **Role stored on the user** (not a permission table): small, fixed role set
  keeps checks fast and readable.
- **Services layer in analytics**: business logic kept out of views → pure,
  unit-testable functions.
- **Attachments stored on local disk** (whitenoise-served static deliberately not
  used for media; media served via nginx proxy). In production use an object store.
- **Files not committed**: `.gitignore` excludes venv, DB files, logs, node_modules.