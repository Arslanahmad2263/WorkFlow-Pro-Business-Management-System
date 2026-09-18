# Developer Guide

Everything you need to continue developing WorkFlow-Pro.

## 1. Repository layout

```
backend/
  config/            Settings, root URLs, wsgi/asgi
  apps/
    core/            Pagination & global exception handler
    accounts/        User model, roles, JWT views, permissions
    projects/        Project + membership
    tasks/           Task + attachments
    activity/        ActivityLog + record_activity()
    analytics/       Dashboard & reports (services + cached views)
  tests/             Factories, conftest, test modules
  requirements.txt / pyproject.toml / .env.example
frontend/
  src/
    lib/             api.ts (axios), services.ts, types.ts, helpers
    contexts/        AuthContext
    hooks/           React Query hooks
    components/      UI kit + domain components
    pages/           Route screens
  Dockerfile, nginx.conf, vite.config.ts
docs/                All documentation
docker-compose.yml   Stack definition
.github/workflows/   CI
```

## 2. Local setup

See the README "Getting started". In short:

```bash
# backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data    # optional demo data
python manage.py runserver

# frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

Backend checks:

```bash
python manage.py check
python manage.py spectacular --file schema.yml --validate   # OpenAPI sanity
pytest
pytest --cov=apps --cov-report=term-missing
ruff check . && ruff format --check .
```

Frontend checks:

```bash
npm run lint
npm run build        # tsc -b + vite build
```

## 3. Configuration model

All runtime config flows through environment variables (`django-environ`) in
`backend/config/settings.py`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEBUG` | `False` | Debug mode |
| `SECRET_KEY` | dev-only | Signing key |
| `ALLOWED_HOSTS` | `*` | Host allowlist |
| `CORS_ALLOWED_ORIGINS` | localhost dev ports | Browser CORS |
| `CSRF_TRUSTED_ORIGINS` | localhost:5173 | CSRF origins |
| `DATABASE_URL` | `sqlite:///db.sqlite3` | DB (Postgres in Docker) |
| `REDIS_URL` | `redis://localhost:6379/1` | Analytics cache |
| `CACHE_TTL_SECONDS` | 60 | Analytics cache TTL |
| `ACCESS_TOKEN_LIFETIME_MINUTES` / `REFRESH_TOKEN_LIFETIME_DAYS` | 30 / 7 | JWT lifetimes |

`backend/.env.example` is the reference; copy to `backend/.env` to override
defaults locally. Compose sets PostgreSQL + Redis URLs directly.

## 4. Adding a feature, end-to-end

Example: add a `billing` field to tasks.

1. **Model** — `backend/apps/tasks/models.py`: add field + migration
   (`python manage.py makemigrations tasks`).
2. **Serializer** — `tasks/serializers.py`: include the field; add any validation.
3. **Migration** — commit + run `python manage.py migrate`.
4. **Frontend type** — `frontend/src/lib/types.ts`: extend `Task`/`TaskPayload`.
5. **Form** — `frontend/src/components/tasks/TaskFormModal.tsx`: add the control.
6. **Tests** — add a case in `backend/tests/test_tasks.py`.
7. Verify: `pytest`, `npm run build`, and either local servers or
   `docker compose up --build`.

## 5. Common patterns

### Backend
- **New list endpoint with filtering** → DRF viewset + `django-filter`
  `FilterSet` (see `projects/filters.py`), add `@extend_schema` where useful.
- **Business rules shared with UI** → put them on the model (
  `Task.save`, `Project.is_overdue`) or in a `services.py` module —
  never duplicate in multiple views.
- **Audit trail** → `apps/activity/services.record_activity(user, action, description, project=None)`
  from the view's `perform_create/update/destroy`.
- **Response shape** → keep the pagination envelope; never return bare lists
  from list views.

### Frontend
- **New read model** → add a typed function in `services.ts`, a hook in
  `hooks/api.ts` (query key + cache), then consume with `useQuery`/`useMutation`.
- **New write** → mutation must invalidate dependent keys (see
  `useCreateTask`'s `onSuccess`).
- **Error UX** → every page renders `ErrorState` (retry) and `EmptyState`;
  mutation errors map through `extractErrorMessage`.
- **Roles in the UI** → use `useRole()` (`isManager`, `isAdmin`) for nav item /
  button visibility; real enforcement is always server-side.

## 6. Docker workflow

```bash
docker compose up -d --build          # build & start
docker compose logs -f backend        # follow backend logs
docker compose exec backend python manage.py shell
docker compose exec backend python manage.py seed_demo_data
docker compose down                   # stop (keeps volumes)
docker compose down -v                # stop + wipe DB volumes
```

- `backend/docker-entrypoint.sh` runs `migrate` + `collectstatic` then starts
  Gunicorn. `frontend/Dockerfile` is multi-stage: build with Vite → serve via nginx,
  which proxies `/api/`, `/static/`, `/media/` to the backend container.

## 7. Contribution checklist

- Run `ruff check .` and fix warnings before pushing.
- Keep `pytest --cov=apps --cov-fail-under=80` green.
- Keep the OpenAPI schema valid (`spectacular --validate`).
- Keep frontend CI green (`npm run lint && npm run build`).
- Update `docs/REQUIREMENTS.md` map when adding a feature.
- Use conventional commit messages (e.g. `feat(accounts): ...`,
  `fix(tasks): ...`, `docs: ...`).