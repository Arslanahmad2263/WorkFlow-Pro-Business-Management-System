
import pytest

from apps.projects.models import Project, ProjectMembership
from tests.factories import (
    MembershipFactory,
    ProjectFactory,
    TaskFactory,
    UserFactory,
)


@pytest.mark.django_db
def test_admin_can_create_project(admin_client):
    resp = admin_client.post(
        "/api/projects/",
        {
            "name": "Website relaunch",
            "description": "Rebuild the marketing site",
            "status": "planning",
            "priority": "high",
            "start_date": "2026-09-01",
            "due_date": "2026-12-01",
        },
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Website relaunch"
    assert body["created_by_name"] == "admin"
    assert body["progress"] == 0.0
    assert "id" in body


@pytest.mark.django_db
def test_employee_cannot_create_project(employee_client):
    resp = employee_client.post(
        "/api/projects/",
        {"name": "Blocked", "description": ""},
        format="json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_employee_can_read_projects(employee_client, project):
    resp = employee_client.get(f"/api/projects/{project.id}/")
    assert resp.status_code == 200
    assert resp.json()["name"] == project.name


@pytest.mark.django_db
def test_project_validation_rejects_due_before_start(manager_client):
    resp = manager_client.post(
        "/api/projects/",
        {
            "name": "Bad dates",
            "start_date": "2026-12-01",
            "due_date": "2026-11-01",
        },
        format="json",
    )
    assert resp.status_code == 400
    assert "due_date" in resp.json()["detail"]


@pytest.mark.django_db
def test_project_unique_name(manager_client, project):
    resp = manager_client.post(
        "/api/projects/",
        {"name": project.name, "description": "duplicate"},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_update_project_to_completed_creates_activity(manager_client, project):
    from apps.activity.models import ActivityLog

    resp = manager_client.patch(
        f"/api/projects/{project.id}/",
        {"status": "completed"},
        format="json",
    )
    assert resp.status_code == 200
    project.refresh_from_db()
    assert project.status == "completed"
    assert ActivityLog.objects.filter(
        project=project, action="project_completed"
    ).exists()


@pytest.mark.django_db
def test_delete_project(manager_client, project):
    resp = manager_client.delete(f"/api/projects/{project.id}/")
    assert resp.status_code == 204
    assert not Project.objects.filter(id=project.id).exists()


@pytest.mark.django_db
def test_project_list_pagination(manager_client):
    for i in range(25):
        ProjectFactory(name=f"Pagination project {i}")
    resp = manager_client.get("/api/projects/", {"page_size": 10})
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] >= 25
    assert body["next"] is not None
    assert len(body["results"]) == 10


@pytest.mark.django_db
def test_project_filter_by_status(manager_client):
    ProjectFactory(name="Active one", status="active")
    ProjectFactory(name="Planning one", status="planning")
    resp = manager_client.get("/api/projects/", {"status": "active"})
    names = [p["name"] for p in resp.json()["results"]]
    assert "Active one" in names
    assert "Planning one" not in names


@pytest.mark.django_db
def test_project_search(manager_client):
    ProjectFactory(name="Alpha rocket")
    ProjectFactory(name="Beta radiator")
    resp = manager_client.get("/api/projects/", {"search": "rocket"})
    names = [p["name"] for p in resp.json()["results"]]
    assert "Alpha rocket" in names
    assert "Beta radiator" not in names


@pytest.mark.django_db
def test_project_filter_by_member(manager_client, project):
    member = UserFactory()
    project.memberships.create(user=member)
    other = ProjectFactory(name="Unrelated project")
    resp = manager_client.get("/api/projects/", {"member": member.id})
    ids = [p["id"] for p in resp.json()["results"]]
    assert project.id in ids
    assert other.id not in ids


@pytest.mark.django_db
def test_project_progress_aggregate(manager_client, project):
    member = UserFactory()
    project.memberships.create(user=member)
    TaskFactory(project=project, status="done", progress=100, assigned_to=member)
    TaskFactory(project=project, status="in_progress", progress=50, assigned_to=member)
    resp = manager_client.get(f"/api/projects/{project.id}/")
    body = resp.json()
    assert body["task_count"] == 2
    assert body["done_task_count"] == 1
    assert body["progress"] == 50.0


@pytest.mark.django_db
def test_add_and_remove_member(manager_client, project):
    member = UserFactory()
    resp = manager_client.post(
        f"/api/projects/{project.id}/members/",
        {"user_id": member.id, "role_in_project": "member"},
        format="json",
    )
    assert resp.status_code == 201
    assert ProjectMembership.objects.filter(project=project, user=member).exists()

    resp = manager_client.delete(
        f"/api/projects/{project.id}/members/{member.id}/",
    )
    assert resp.status_code == 204
    assert not ProjectMembership.objects.filter(project=project, user=member).exists()


@pytest.mark.django_db
def test_add_duplicate_member_rejected(manager_client, project):
    member = UserFactory()
    MembershipFactory(project=project, user=member)
    resp = manager_client.post(
        f"/api/projects/{project.id}/members/",
        {"user_id": member.id},
        format="json",
    )
    assert resp.status_code == 400
    assert "user_id" in resp.json()["detail"]


@pytest.mark.django_db
def test_employee_cannot_add_members(employee_client, project):
    resp = employee_client.post(
        f"/api/projects/{project.id}/members/",
        {"user_id": 1},
        format="json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_project_not_found_returns_consistent_shape(manager_client):
    resp = manager_client.get("/api/projects/99999/")
    assert resp.status_code == 404
    assert resp.json()["type"] == "not_found"


@pytest.fixture
def project(manager):
    return ProjectFactory(name="Test project", created_by=manager)
