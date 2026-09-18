
import pytest

from tests.factories import (
    MembershipFactory,
    ProjectFactory,
    TaskFactory,
    UserFactory,
)


@pytest.mark.django_db
def test_manager_can_create_task(manager_client, manager):
    project = ProjectFactory(name="Sprint 12", created_by=manager)
    resp = manager_client.post(
        "/api/tasks/",
        {
            "project": project.id,
            "title": "Build login page",
            "description": "Auth + validation",
            "status": "todo",
            "priority": "high",
            "due_date": "2026-10-01",
            "estimated_hours": 8.0,
        },
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Build login page"
    assert body["project_name"] == project.name
    assert body["progress"] == 0


@pytest.mark.django_db
def test_employee_cannot_create_task(employee_client):
    project = ProjectFactory(name="Read only project")
    resp = employee_client.post(
        "/api/tasks/",
        {"project": project.id, "title": "Should fail"},
        format="json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_employee_can_update_own_task_status(employee_client, employee):
    project = ProjectFactory(name="Own task project")
    MembershipFactory(project=project, user=employee)
    task = TaskFactory(
        project=project,
        title="Own task",
        assigned_to=employee,
    )
    resp = employee_client.patch(
        f"/api/tasks/{task.id}/",
        {"status": "in_progress", "progress": 40},
        format="json",
    )
    assert resp.status_code == 200
    task.refresh_from_db()
    assert task.status == "in_progress"
    assert task.progress == 40


@pytest.mark.django_db
def test_employee_cannot_update_task_assigned_to_other(employee_client, task, employee):
    assert task.assigned_to_id != employee.id
    resp = employee_client.patch(
        f"/api/tasks/{task.id}/",
        {"status": "done", "progress": 100},
        format="json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_employee_cannot_delete_task(employee_client, task):
    resp = employee_client.delete(f"/api/tasks/{task.id}/")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_done_task_forces_progress_100_and_completed_at(task):
    task.status = "done"
    task.progress = 60
    task.save()
    task.refresh_from_db()
    assert task.progress == 100
    assert task.completed_at is not None


@pytest.mark.django_db
def test_unmarking_done_clears_completed_at(task):
    task.status = "done"
    task.progress = 60
    task.save()
    task.status = "in_progress"
    task.save()
    task.refresh_from_db()
    assert task.completed_at is None


@pytest.mark.django_db
def test_done_status_requires_full_progress_in_api(manager_client, task):
    resp = manager_client.patch(
        f"/api/tasks/{task.id}/",
        {"status": "done", "progress": 50},
        format="json",
    )
    assert resp.status_code == 400
    assert "status" in resp.json()["detail"]


@pytest.mark.django_db
def test_progress_out_of_range_rejected(manager_client, task):
    resp = manager_client.patch(
        f"/api/tasks/{task.id}/",
        {"progress": 150},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_assignee_must_be_project_member(manager_client, task):
    outsider = UserFactory(username="outsider")
    resp = manager_client.patch(
        f"/api/tasks/{task.id}/",
        {"assigned_to": outsider.id},
        format="json",
    )
    assert resp.status_code == 400
    assert "assigned_to" in resp.json()["detail"]


@pytest.mark.django_db
def test_task_filter_by_priority_and_status(manager_client):
    project = ProjectFactory(name="Filter project")
    done_high = TaskFactory(project=project, status="done", priority="high")
    todo_low = TaskFactory(project=project, status="todo", priority="low")
    resp = manager_client.get("/api/tasks/", {"priority": "high", "status": "done"})
    ids = [t["id"] for t in resp.json()["results"]]
    assert done_high.id in ids
    assert todo_low.id not in ids


@pytest.mark.django_db
def test_task_filter_by_assignee(manager_client, task):
    assignee = UserFactory(username="assignee")
    MembershipFactory(project=task.project, user=assignee)
    task.assigned_to = assignee
    task.save()
    resp = manager_client.get("/api/tasks/", {"assigned_to": assignee.id})
    ids = [t["id"] for t in resp.json()["results"]]
    assert task.id in ids


@pytest.mark.django_db
def test_task_search(manager_client, task):
    TaskFactory(title="Unrelated widget", project=task.project)
    resp = manager_client.get("/api/tasks/", {"search": task.title})
    ids = [t["id"] for t in resp.json()["results"]]
    assert task.id in ids


@pytest.mark.django_db
def test_task_list_paginated(manager_client):
    project = ProjectFactory(name="Pagination task project")
    for i in range(25):
        TaskFactory(title=f"Paginated task {i}", project=project)
    resp = manager_client.get("/api/tasks/", {"page_size": 10})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 10
    assert resp.json()["count"] == 25


@pytest.mark.django_db
def test_attachment_type_validation(manager_client, task):
    from django.core.files.uploadedfile import SimpleUploadedFile

    bad_file = SimpleUploadedFile("virus.exe", b"mz", content_type="application/octet-stream")
    resp = manager_client.post(
        "/api/tasks/",
        {
            "project": task.project.id,
            "title": "Task with bad attachment",
            "attachment": bad_file,
        },
        format="multipart",
    )
    assert resp.status_code == 400
    assert "attachment" in resp.json()["detail"]


@pytest.fixture
def task(manager):
    project = ProjectFactory(name="Task fixture project", created_by=manager)
    member = UserFactory(username="fixture-assignee")
    MembershipFactory(project=project, user=member)
    return TaskFactory(
        project=project,
        title="Fixture task",
        created_by=manager,
        assigned_to=member,
    )
