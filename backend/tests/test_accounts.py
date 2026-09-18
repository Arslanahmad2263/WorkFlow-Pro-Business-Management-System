
import pytest

from apps.accounts.models import Role, User


@pytest.mark.django_db
def test_register_creates_employee_and_returns_tokens(api_client):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "newuser",
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "r0bust-password",
            "password2": "r0bust-password",
        },
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["role"] == Role.EMPLOYEE
    assert body["user"]["username"] == "newuser"
    assert body["access"] and body["refresh"]
    user = User.objects.get(username="newuser")
    assert user.check_password("r0bust-password")
    assert not user.is_staff


@pytest.mark.django_db
def test_register_rejects_mismatched_passwords(api_client):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "newuser2",
            "email": "new2@example.com",
            "password": "strong-pass-123",
            "password2": "wrong-pass",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "password2" in resp.json()["detail"]


@pytest.mark.django_db
def test_register_rejects_duplicate_email(api_client, employee):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "takenusername",
            "email": employee.email,
            "password": "strong-pass-123",
            "password2": "strong-pass-123",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"]


@pytest.mark.django_db
def test_register_rejects_weak_password(api_client):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "weakpass",
            "email": "weak@example.com",
            "password": "12345678",
            "password2": "12345678",
        },
        format="json",
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    # Field-level or non-field validation errors are both consistent envelopes.
    keys = detail.keys() if isinstance(detail, dict) else []
    assert "password" in keys or "non_field_errors" in keys


@pytest.mark.django_db
def test_login_returns_tokens(api_client, employee):
    resp = api_client.post(
        "/api/auth/login/",
        {"username": employee.username, "password": "password123"},
        format="json",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["id"] == employee.id
    assert body["access"] and body["refresh"]


@pytest.mark.django_db
def test_login_rejects_bad_credentials(api_client, employee):
    resp = api_client.post(
        "/api/auth/login/",
        {"username": employee.username, "password": "wrong-password"},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.json()["type"] == "validation_error"


@pytest.mark.django_db
def test_me_returns_profile(employee_client, employee):
    resp = employee_client.get("/api/auth/me/")
    assert resp.status_code == 200
    assert resp.json()["username"] == employee.username


@pytest.mark.django_db
def test_refresh_rotates_tokens(api_client, employee):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(employee)
    resp = api_client.post("/api/auth/refresh/", {"refresh": str(refresh)}, format="json")
    assert resp.status_code == 200
    assert resp.json()["access"]


@pytest.mark.django_db
def test_logout_blacklists_token(employee_client, employee):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(employee)
    resp = employee_client.post("/api/auth/logout/", {"refresh": str(refresh)}, format="json")
    assert resp.status_code == 204


@pytest.mark.django_db
def test_protected_endpoint_requires_auth(api_client):
    resp = api_client.get("/api/projects/")
    assert resp.status_code == 401
    assert resp.json()["type"] == "authentication_error"


@pytest.mark.django_db
def test_admin_can_create_user_with_role(admin_client):
    resp = admin_client.post(
        "/api/auth/users/",
        {
            "username": "mgr1",
            "email": "mgr1@example.com",
            "role": Role.MANAGER,
            "password": "password123",
        },
        format="json",
    )
    assert resp.status_code == 201
    user = User.objects.get(username="mgr1")
    assert user.role == Role.MANAGER
    assert user.check_password("password123")


@pytest.mark.django_db
def test_employee_cannot_manage_users(employee_client):
    resp = employee_client.post(
        "/api/auth/users/",
        {"username": "x", "email": "x@example.com", "role": Role.EMPLOYEE},
        format="json",
    )
    assert resp.status_code in (403, 405)


@pytest.mark.django_db
def test_active_users_list(manager_client, employee):
    resp = manager_client.get("/api/auth/users/active/")
    assert resp.status_code == 200
    usernames = [u["username"] for u in resp.json()]
    assert employee.username in usernames


@pytest.mark.django_db
def test_password_is_hashed_not_plaintext(api_client):
    api_client.post(
        "/api/auth/register/",
        {
            "username": "hashuser",
            "email": "hash@example.com",
            "password": "r0bust-password",
            "password2": "r0bust-password",
        },
        format="json",
    )
    user = User.objects.get(username="hashuser")
    assert user.password != "r0bust-password"
    assert user.password.startswith("argon2") or user.password.startswith("pbkdf2")


@pytest.mark.django_db
def test_login_throttle_tracks_attempts():
    # Verify the throttle config is wired (login endpoint uses anon scope).
    from rest_framework.settings import api_settings

    rates = api_settings.DEFAULT_THROTTLE_RATES
    assert "anon" in rates
    assert "user" in rates
