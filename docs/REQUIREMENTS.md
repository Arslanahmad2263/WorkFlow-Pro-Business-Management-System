# WorkFlow-Pro — Requirements to Implementation Checklist

Map of the official **ULT Technology Python Developer Advanced Internship Task** to the
implementation in this repository. Each requirement is tracked to the deliverable that
satisfies it.

## 1. Project scenario

| Requirement | Implementation |
| --- | --- |
| Business Management & Task Tracking System for a small company | WorkFlow-Pro: users manage projects, tasks, team members and reports. See [`README.md`](../README.md) |

## 2. Functional requirements

| Requirement | Implementation |
| --- | --- |
| User registration/login/logout, password handling, role-based access | `accounts` app — JWT login, token refresh, logout (token revocation via `blacklist`), roles on `User`. See [`docs/API.md`](API.md) |
| Dashboard: summary of projects, tasks, status, priorities, activity metrics | [`backend/apps/analytics`](../backend/apps/analytics) -> `GET /api/dashboard/summary/` |
| CRUD with validation | Projects, Tasks, Memberships + full CRUD serializers with validation |
| Project management: assign members, status/deadline, progress | `Project` + `ProjectMembership` models, members CRUD under `/api/projects/{id}/members/` |
| Task management: priority/status/deadline, progress | `Task` model + CRUD API |
| Search & filtering (status, priority, user, date) | `django-filter` on projects/tasks list endpoints |
| Relational database, clean schema | PostgreSQL (prod) / SQLite (dev), >4 related models. ER: [`docs/DATABASE.md`](DATABASE.md) |
| RESTful API with proper methods/responses | DRF `ModelViewSet` endpoints, correct verbs, status codes in [`docs/API.md`](API.md) |
| Validation & secure error messages | Serializer validation + consistent JSON error handler |
| Reporting: completed/overdue tasks, project progress | `GET /api/reports/tasks/`, `GET /api/reports/project-progress/` |

## 3. Technical requirements

| Requirement | Implementation |
| --- | --- |
| Python 3.x | 3.12 (see `backend/requirements.txt`, Dockerfiles) |
| Django / DRF with justification | Django + DRF — rationale in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) |
| PostgreSQL preferred / SQLite acceptable | `DATABASE_URL`-driven: PostgreSQL in Docker, SQLite fallback for local dev |
| Logical module organization | Django apps: `accounts`, `projects`, `tasks`, `activity`, `analytics` |
| REST principles, status codes, validation, consistent JSON | DRF views + custom exception handler |
| Security: passwords, validation, no hard-coded secrets | PBKDF2/argon2 password hashing, serializer validation, env-driven settings |
| Configuration via environment variables | `django-environ`, `.env.example`, per-service env in `docker-compose.yml` |
| Clean git repo, meaningful commits, professional README | See `git log`, `README.md` |
| Dependencies: requirements.txt + install docs | `backend/requirements.txt` + install instructions in README |

## 4. Database & API deliverables

| Requirement | Implementation |
| --- | --- |
| ≥4 related models with PK/FK | `User`, `Project`, `ProjectMembership`, `Task`, `ActivityLog` |
| CRUD API for ≥3 resources | Projects, Tasks, Memberships (+ Users for admins) |
| Protected endpoints | All endpoints require JWT except register/login/schema |
| Pagination on ≥1 list endpoint | Global `PageNumberPagination`, applied to all lists |
| ≥2 filters/search | Status, priority, assignee, project, due-date, keyword search |
| Server-side validation of important fields | Serializers: dates, progress bounds, status/priority enums, unique checks |
| API documentation | drf-spectacular Swagger UI + [`docs/API.md`](API.md) |
| Consistent error handling | Custom global exception handler + error envelope documented |

## 5. Testing & code quality

| Requirement | Implementation |
| --- | --- |
| Unit tests for business logic/validation | `backend/tests/test_projects.py` etc. (validation edge cases) |
| API/integration tests for major endpoints | `backend/tests/test_accounts.py`, `test_tasks.py`, `test_analytics.py` |
| Meaningful coverage | Run `pytest`; coverage report in [`docs/TESTING.md`](TESTING.md) |
| PEP 8, readable naming | Ruff lint + format config, see [`docs/DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) |
| No duplication, focused functions/classes | Services layer (`analytics/services.py`) for business logic |
| Safe error output | DRF default + custom handler never leaks stack traces |
| Logging | LOGGING config: console + file, request/error/auth logging |

## 6. Bonus requirements implemented

| Bonus | Where |
| --- | --- |
| JWT token-based API authentication | SimpleJWT access/refresh + `blacklist` logout |
| Role-based permissions (Admin / Manager / Employee) | `accounts/permissions.py`, enforced on all viewsets |
| Redis | Cache backend (django-redis) for dashboard/report analytics |
| Interactive API documentation | drf-spectacular Swagger UI at `/api/docs/` |
| Docker-based local development | `docker-compose.yml` (db, redis, backend, frontend) |
| File upload & secure handling | Task attachments via `FileField` + `upload_to` whitelist validation |
| Automated CI checks | `.github/workflows/ci.yml` (lint + test + frontend build) |

## 7. Documentation deliverables

| Required doc | File |
| --- | --- |
| README (overview, features, stack, install, run, usage) | `README.md` |
| Architecture diagram + explanation | `docs/ARCHITECTURE.md` |
| Database ER diagram/schema + relationships | `docs/DATABASE.md` |
| API documentation (endpoints, auth, params, examples, errors) | `docs/API.md` |
| Testing report (strategy, cases, results, limitations) | `docs/TESTING.md` |
| Security notes | `docs/SECURITY.md` |
| User guide (main workflows) | `docs/USER_GUIDE.md` |
| Developer guide (structure, continuing development) | `docs/DEVELOPER_GUIDE.md` |

## 8. Submission checklist

- [x] Complete working Python application (backend + frontend)
- [x] Git repository with meaningful commits
- [x] README.md + setup instructions
- [x] Source code with clean structure
- [x] ER diagram, API docs, tests, security/config notes, user/dev guides
- [x] requirements.txt
- [x] Docker-based local development
- [x] CI workflow