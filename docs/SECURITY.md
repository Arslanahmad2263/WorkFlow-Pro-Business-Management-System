# Security

## 1. Authentication

- **JWT with SimpleJWT** (`rest_framework_simplejwt`). Access tokens are
  short-lived (30 min default), refresh tokens long-lived (7 days) and **rotated
  on refresh** (`ROTATE_REFRESH_TOKENS=True`).
- **Logout revokes sessions**: the refresh token is added to the token blacklist
  (`blacklist_after_rotation=True`). A logged-out/rotated refresh token can no
  longer mint access tokens.
- Tokens are passed only as `Authorization: Bearer <token>`; they are never in
  URLs. The SPA stores tokens in `localStorage` and attaches them via an Axios
  interceptor (acceptable for an internship demo; see §6 for hardening).
- All endpoints except `register`, `login` and the OpenAPI schema require a valid
  token.

## 2. Authorization (RBAC)

Server-side enforcement, never client-side:

| Permissions class | Allowed |
| --- | --- |
| `IsAdmin` | `admin` only — user management (`/api/auth/users/`) |
| `IsManager` | `admin` + `manager` — reports |
| `IsAdminOrManager` | read for all; write only `admin`/`manager` (projects, memberships) |
| Task viewset logic | create/delete: `admin`/`manager`; `PATCH`: `admin`/`manager` **or** employee but only on tasks `assigned_to` them |

Object-level checks happen in the view (`check_object_permissions`), so direct
URL manipulation cannot bypass role rules.

## 3. Passwords

- `AUTH_PASSWORD_VALIDATORS` — Django's default four (length ≥ 8, not common,
  not numeric-only, not too similar to the username).
- **Argon2 preferred** hasher with PBKDF2 fallback (`PASSWORD_HASHERS`).
- Passwords are always write-only in serializers; never returned in responses or
  logged.
- Admin-created users get a password set via `set_password` (hashed).

## 4. Input validation & data safety

- Serializer-level business rules: date ordering, progress bounds, status⇄progress
  coupling, unique names, membership uniqueness, assignee must belong to project.
- **Attachment whitelist**: only `png jpg jpeg gif pdf txt docx xlsx csv md`,
  max **5 MB**, served from a dedicated media location, name sanitised via
  `os.path.basename`.
- Global exception handler returns a fixed error envelope — **no stack traces,
  no exception internals** ever reach the client.

## 5. Transport & configuration

- **No hard-coded secrets**: `SECRET_KEY`, DB URL, Redis URL and CORS origins all
  come from environment variables (`django-environ`). `.env.example` documents
  every variable; `.env` is git-ignored.
- `SECURE_PROXY_SSL_HEADER` is set so the app trusts `X-Forwarded-Proto` behind a
  TLS-terminating proxy.
- **CORS** explicitly lists allowed browser origins; credentials are allowed only
  for those origins.
- `CSRF_TRUSTED_ORIGINS` is env-driven. (JWT auth is CSRF-immune; the list covers
  the optional Django admin usage.)
- Django security middleware is active by default (SecurityMiddleware,
  XFrameOptions, etc.).

## 6. Abuse protection

- **Rate limiting** via DRF throttles: `anon` **60/hour** (register/login),
  `user` **1000/hour**.
- Logging records failed logins and key mutations (`apps` logger → console +
  `backend/logs/workflow.log`).
- Failed login attempts return a generic “Invalid credentials or inactive
  account.” message that does not reveal whether a username exists.

## 7. Environment checklist (production)

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` generated (`python -c "import secrets; print(secrets.token_urlsafe(64))"`) and rotated periodically
- [ ] `ALLOWED_HOSTS` restricted to real hostnames
- [ ] `CORS_ALLOWED_ORIGINS` restricted to the actual frontend origin
- [ ] TLS at the reverse proxy; `X-Forwarded-Proto=https`
- [ ] Postgres credentials replaced with generated, least-privilege ones
- [ ] `DATABASE_URL`/`REDIS_URL` not in version control (`.env` ignored)
- [ ] Media files moved to object storage if scale grows
- [ ] Access token lifetime lowered for stricter environments

## 8. Known trade-offs (documented)

- Tokens in `localStorage` are XSS-readable; a hardened build should move to
  `HttpOnly` cookies with a CSRF token, or use the Web Crypto OIDC flow. Kept
  simple here per the internship scope.
- Role changes for a logged-in user take effect on the next request because
  permissions are computed per-request and JWT has no role claim — the frontend
  re-fetches `/auth/me/` after login.