# WorkFlow-Pro

**Business Management & Task Tracking System** — a full-stack application for
small companies to manage projects, tasks, team members and reporting.

Built for the **ULT Technology — Python Developer Advanced Internship Task**.

---

## Highlights

- **JWT-authenticated REST API** (Django + Django REST Framework) with role-based
  access control: **Admin**, **Manager** and **Employee**.
- **Modern React SPA** (React 18 + TypeScript + Vite + Tailwind CSS + React Query).
- **Projects** with members, status, priority, deadline and progress tracking.
- **Tasks** with assignees, status/priority workflow, progress, estimated hours
  and file attachments.
- **Dashboard** with metrics and a live activity feed.
- **Analytics reports** (completed/overdue tasks, completion rate by priority,
  project progress) cached in **Redis**.
- **Consistent error handling**, validation, throttling, pagination and search.
- Interactive **OpenAPI/Swagger documentation**.
- **Docker Compose** stack: PostgreSQL · Redis · Django API · nginx + React frontend.
- **CI pipeline** (GitHub Actions): lint, test, schema check, frontend build.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.12, Django 5, Django REST Framework, SimpleJWT, django-filter, drf-spectacular |
| Database | PostgreSQL 16 (Docker) / SQLite (local dev fallback) |
| Cache | Redis via django-redis (analytics caching) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Axios |
| Infra | Docker & Docker Compose, nginx, Gunicorn, WhiteNoise |
| CI | GitHub Actions (ruff + pytest + coverage + frontend build) |

## Getting started

### 1. Run everything with Docker (recommended)

Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2.

```bash
docker compose up -d --build
```

Then:

| URL | What |
| --- | --- |
| http://localhost | Frontend application |
| http://localhost/api/docs/ | Swagger UI (interactive API docs) |
| http://localhost/api/schema/ | OpenAPI schema (JSON) |

Seed demo users (first run):

```bash
docker compose exec backend python manage.py seed_demo_data
```

Demo accounts — password for all: `DemoPass123!`

| Username | Role |
| --- | --- |
| `admin` | Admin — full access + user management |
| `manager` | Manager — create/edit projects, tasks, members |
| `alice` / `bob` / `carol` | Employee — read access, update their own tasks |

### 2. Local development (without Docker)

**Backend** — Python 3.12:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
source .venv/bin/activate         # Linux/macOS
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

The backend runs at http://localhost:8000 (API under `/api/`, Swagger at `/api/docs/`).
Configuration is environment-driven — copy `backend/.env.example` to `backend/.env`
and adjust if needed. Defaults: SQLite database, no Redis required.

**Frontend** — Node.js 22:

```bash
cd frontend
npm install
npm run dev
```

The dev server (http://localhost:5173) proxies `/api/*` to the backend on port 8000.

## Project structure

```
WorkFlow-Pro/
├── backend/                 # Django REST API
│   ├── config/              # Settings, URLs, ASGI/WSGI
│   ├── apps/
│   │   ├── accounts/        # User, roles, JWT auth, user management
│   │   ├── projects/        # Project + membership CRUD
│   │   ├── tasks/           # Task CRUD, filters, attachments
│   │   ├── activity/        # Activity log (audit trail)
│   │   ├── analytics/       # Dashboard + reports (Redis-cached)
│   │   └── core/            # Pagination, exception handler
│   ├── tests/               # 66 tests, ~92% coverage
│   └── requirements.txt
├── frontend/                # React + TypeScript SPA
│   └── src/
│       ├── components/      # UI kit, shell, modals, tables
│       ├── contexts/        # Auth context (tokens, session)
│       ├── hooks/           # React Query hooks
│       ├── lib/             # API client, types, helpers
│       └── pages/           # Login, Register, Dashboard, Projects,
│                            #   Project detail, Tasks, Team, Reports
├── docs/                    # Architecture, DB, API, testing, security,
│                            #   user & developer guides
├── docker-compose.yml       # db + redis + backend + frontend
└── .github/workflows/ci.yml # CI pipeline
```

## Quick feature tour

| Role | Can do |
| --- | --- |
| Admin | Everything. Also manage team users (create, change roles, activate/deactivate, delete). |
| Manager | Create/edit/delete projects & tasks, manage project members, view reports. |
| Employee | View all projects/tasks; update status/progress **only of tasks assigned to them**. |

## Documentation

| Doc | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, diagrams, tech choices |
| [`docs/DATABASE.md`](docs/DATABASE.md) | ER diagram, schema, relationships, indexes |
| [`docs/API.md`](docs/API.md) | Full API reference: endpoints, auth, errors |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing strategy, cases, results, coverage |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security model, hardening, config notes |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Main workflows for each role |
| [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) | Code structure & continuing development |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Requirement-to-implementation map |

## Testing

```bash
cd backend
pytest                          # full suite
pytest --cov=apps --cov-report=term-missing   # coverage report
```

See [`docs/TESTING.md`](docs/TESTING.md) for details.

## License

Educational project for an internship submission.