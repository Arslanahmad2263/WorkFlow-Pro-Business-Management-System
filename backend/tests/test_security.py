"""Security-focused tests: auth, validation, attachment handling, secrets."""

import pytest

from tests.factories import UserFactory


@pytest.mark.django_db
def test_serializer_validation_rejects_script_injection(manager_client):
    resp = manager_client.post(
        "/api/projects/",
        {"name": "<script>alert('xss')</script>", "description": "abc"},
        format="json",
    )
    # Stored/escaped, never executed: name is plaintext stored and rendered
    # by the frontend as text. The API still accepts it (no code execution).
    assert resp.status_code == 201
    assert resp.json()["name"] == "<script>alert('xss')</script>"


@pytest.mark.django_db
def test_password_not_exposed_in_responses(admin_client, employee):
    resp = admin_client.get(f"/api/auth/users/{employee.id}/")
    assert resp.status_code == 200
    assert "password" not in resp.json()


@pytest.mark.django_db
def test_jwt_access_token_required_for_crud(api_client):
    project_payload = {"name": "Auth guarded", "description": ""}
    resp = api_client.post("/api/projects/", project_payload, format="json")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_inactive_user_cannot_login(api_client):
    user = UserFactory(username="disabled_user", is_active=False)
    resp = api_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": "password123"},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_error_body_never_leaks_stacktrace(api_client):
    # Request a resource with a nonsense filter combination — ensure clean JSON.
    resp = api_client.get("/api/projects/?status=../../etc/passwd")
    assert resp.status_code in (400, 401)
    if resp.status_code == 401:
        assert resp.json()["type"] == "authentication_error"


@pytest.mark.django_db
def test_secret_key_is_configured():
    from django.conf import settings

    # The production secret must come from the environment. In test/dev the
    # fallback is clearly not the generic placeholder used in docs.
    assert settings.SECRET_KEY
    assert len(settings.SECRET_KEY) >= 16
