# Testing

## 1. Strategy

Three layers, all in `backend/tests/` and runnable with a single `pytest` command:

| Layer | Focus | Files |
| --- | --- | --- |
| Unit tests | Models, services, permissions, pure business logic | `test_accounts.py`, `test_projects.py`, `test_tasks.py`, `test_permissions.py`, `test_security.py` |
| API / integration | Endpoints, RBAC, pagination, filtering, serializers, status codes | `test_accounts.py`, `test_projects.py`, `test_tasks.py`, `test_analytics.py` |
| Security | Auth flows, brute-force throttling, error leaks, JWT tokens | `test_security.py` |

Factories (`tests/factories.py`) build `User`, `Project`, `ProjectMembership`
and `Task` fixtures. `tests/conftest.py` speeds the suite up by **overriding the
password hasher to PBKDF2** and using an **in-memory / LocMem cache** so tests
never need Redis.

## 2. Running the suite

```bash
cd backend
pytest                                  # test discovery + run
pytest -q                               # quiet
pytest --cov=apps --cov-report=term-missing   # coverage
```

Requires the venv from `requirements.txt` (includes `pytest`, `pytest-django`,
`pytest-cov`, `factory-boy`, `ruff`).

## 3. Coverage report (last full run)

| Item | Value |
| --- | --- |
| Suite size | **66 tests** |
| Result | **66 passed** |
| Coverage (`apps`) | **91.64%** |
| Failures / errors | 0 |

Coverage highlights (>95%): accounts serializers & views, task serializers
(validation paths), analytics services, exception handler.
Lower-covered corners: some middleware/pagination branches and maintenance
paths are covered indirectly through integration tests.

## 4. What the tests verify

**Authentication & accounts**
- Register success, duplicate username/email, password mismatch, weak password.
- Login success/failure, active vs inactive accounts.
- Token refresh rotation and logout blacklisting.
- `/auth/me/` retrieval and profile updates.

**RBAC permissions**
- Employee cannot create/update/delete projects.
- Employee cannot delete tasks; cannot update someone else's task; **can**
  update tasks assigned to them.
- Admin/manager can do all project/task operations.
- Non-admin cannot access `/auth/users/`; non-manager cannot access reports.

**Projects**
- CRUD lifecycle, unique name, due-date ≥ start-date validation.
- Member add/remove, duplicate membership rejection.
- Filtering by status/priority/member/dates, search, pagination envelope.

**Tasks**
- CRUD, status/progress coupling (`done` requires 100%; reset otherwise).
- Assignee must be a project member.
- Attachment type whitelist + size limit enforcement.
- Overdue flag across date boundaries; filters by status/priority/project/assignee.

**Analytics**
- Dashboard aggregate shapes, upcoming deadlines, recent activity.
- Tasks report period/pagination keys, completion-rate math.
- Project progress rows.
- Redis-cached responses return the payload without error when cache is warm.

**Security**
- Passwords hashed (never plaintext), hasher config respected.
- No stack trace leakage in API errors (`internal_error` envelope only).
- Rate limiting on anonymous authentication endpoints (429 after the anon limit).
- JWT protected endpoints reject missing/malformed tokens.
- CSRF-free JWT flow; secrets only via environment variables.

## 5. CI integration

`.github/workflows/ci.yml` runs on every push/PR:

1. `ruff check .` (lint)
2. `python manage.py spectacular --validate` (OpenAPI schema stays valid)
3. `pytest --cov=apps --cov-fail-under=80` (tests + coverage gate)
4. Frontend: `npm ci` → `npm run lint` → `npm run build`

## 6. Known limitations

- Attachments are validated but not downloaded/rendered in tests (disk write is
  mocked via tmp `MEDIA_ROOT`).
- Rate-limit tests depend on the configured anon throttle (60/hour) — if the
  limit changes, the corresponding test threshold must follow.
- E2E browser flows (Playwright) are not yet included; the REST layer is covered
  by integration tests, and the SPA is type-checked and built in CI.