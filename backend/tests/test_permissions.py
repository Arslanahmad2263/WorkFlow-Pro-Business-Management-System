"""Demonstrate role-based access control across the major resources."""

import pytest

from tests.factories import (
    MembershipFactory,
    ProjectFactory,
    TaskFactory,
    UserFactory,
)


@pytest.mark.django_db
def test_return_403_json_envelope_for_employee_write(employee_client, project):
    resp = employee_client.post(
        "/api/projects/",
        {"name": "No no", "description": ""},
        format="json",
    )
    assert resp.status_code == 403
    body = resp.json()
    assert body["type"] == "permission_denied"
    assert "detail" in body


@pytest.mark.django_db
def test_manager_full_access_to_projects(manager_client, manager):
    project = ProjectFactory(name="Manager access project", created_by=manager)
    resp = manager_client.patch(
        f"/api/projects/{project.id}/",
        {"priority": "critical"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["priority"] == "critical"


@pytest.mark.django_db
def test_admin_user_list_and_detail(admin_client, employee):
    resp = admin_client.get("/api/auth/users/")
    assert resp.status_code == 200
    assert any(u["username"] == employee.username for u in resp.json()["results"])

    resp = admin_client.patch(
        f"/api/auth/users/{employee.id}/",
        {"role": "manager"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "manager"


@pytest.mark.django_db
def test_manager_cannot_manage_users(manager_client):
    resp = manager_client.get("/api/auth/users/")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_optout_write_for_authenticated_read_on_tasks(employee_client, task):
    # Employee can read all tasks but cannot delete.
    resp = employee_client.get(f"/api/tasks/{task.id}/")
    assert resp.status_code == 200
    resp = employee_client.delete(f"/api/tasks/{task.id}/")
    assert resp.status_code in (403, 405)


@pytest.mark.django_db
def test_swagger_schema_accessible(api_client):
    resp = api_client.get("/api/schema/")
    assert resp.status_code in (200, 401)  # schema view is unauth; assert it exists
    assert resp.status_code in (200, 401)


@pytest.fixture
def task(manager, project):
    member = UserFactory(username="rbac-member")
    MembershipFactory(project=project, user=member)
    return TaskFactory(project=project, title="RBAC task", assigned_to=member)


@pytest.fixture
def project(manager):
    return ProjectFactory(name="RBAC project", created_by=manager)
