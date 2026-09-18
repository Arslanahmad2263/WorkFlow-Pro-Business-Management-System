from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.activity.models import ActivityLog
from tests.factories import (
    MembershipFactory,
    ProjectFactory,
    TaskFactory,
    UserFactory,
)


@pytest.mark.django_db
def test_dashboard_summary_counts(manager_client):
    project = ProjectFactory(name="Dashboard project", status="active")
    member = UserFactory()
    MembershipFactory(project=project, user=member)
    TaskFactory(project=project, status="done", progress=100, assigned_to=member)
    TaskFactory(project=project, status="todo", assigned_to=member)
    TaskFactory(project=project, status="todo", assigned_to=member)

    resp = manager_client.get("/api/dashboard/summary/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["projects"]["total"] >= 1
    assert body["projects"]["by_status"]["active"] >= 1
    assert body["tasks"]["total"] >= 3
    assert body["tasks"]["by_status"]["done"] >= 1
    assert body["members"] >= 1


@pytest.mark.django_db
def test_dashboard_tracks_upcoming_and_overdue(manager_client):
    project = ProjectFactory(name="Dates project")
    TaskFactory(
        project=project,
        due_date=timezone.localdate() + timedelta(days=3),
    )
    TaskFactory(
        project=project,
        due_date=timezone.localdate() - timedelta(days=1),
        status="todo",
    )
    body = manager_client.get("/api/dashboard/summary/").json()
    assert body["tasks"]["overdue"] >= 1
    assert any(
        d["due_date"] is not None for d in body["upcoming_deadlines"]
    )


@pytest.mark.django_db
def test_tasks_report_completion_and_overdue(manager_client):
    project = ProjectFactory(name="Report project")
    member = UserFactory()
    MembershipFactory(project=project, user=member)

    # One completed recently, one overdue and open.
    TaskFactory(project=project, status="done", progress=100, completed_at=timezone.now())
    TaskFactory(
        project=project,
        status="todo",
        due_date=timezone.localdate() - timedelta(days=2),
    )

    resp = manager_client.get("/api/reports/tasks/?days=30")
    assert resp.status_code == 200
    body = resp.json()
    assert body["completed_tasks"] >= 1
    assert body["overdue_tasks"] >= 1
    assert "completion_rate_by_priority" in body
    assert body["period_days"] == 30


@pytest.mark.django_db
def test_tasks_report_rejects_bad_days(manager_client):
    resp = manager_client.get("/api/reports/tasks/?days=abc")
    assert resp.status_code == 400
    resp = manager_client.get("/api/reports/tasks/?days=99999")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_project_progress_report(manager_client):
    project = ProjectFactory(name="Progress report project")
    member = UserFactory()
    MembershipFactory(project=project, user=member)
    TaskFactory(project=project, status="done", progress=100, assigned_to=member)
    TaskFactory(project=project, status="done", progress=100, assigned_to=member)
    TaskFactory(project=project, status="todo", assigned_to=member)

    resp = manager_client.get("/api/reports/project-progress/")
    assert resp.status_code == 200
    rows = {r["name"]: r for r in resp.json()}
    row = rows[project.name]
    assert row["task_count"] == 3
    assert row["done_task_count"] == 2
    assert row["progress"] == pytest.approx(66.7, abs=0.4)


@pytest.mark.django_db
def test_analytics_response_is_cached(manager_client):
    from apps.analytics import services as analytics_services

    with patch.object(
        analytics_services, "dashboard_summary", wraps=analytics_services.dashboard_summary
    ) as spy:
        manager_client.get("/api/dashboard/summary/")
        manager_client.get("/api/dashboard/summary/")
        # Second call hits the Redis cache, so the underlying service runs once.
        assert spy.call_count == 1


@pytest.mark.django_db
def test_reports_dashboard_endpoints_auth_required(api_client):
    for url in (
        "/api/dashboard/summary/",
        "/api/reports/tasks/",
        "/api/reports/project-progress/",
    ):
        resp = api_client.get(url)
        assert resp.status_code == 401, url


@pytest.mark.django_db
def test_activity_feed_recorded_on_crud(manager_client, manager):
    project_resp = manager_client.post(
        "/api/projects/",
        {"name": "Activity feed project", "description": "x"},
        format="json",
    )
    assert project_resp.status_code == 201
    project_id = project_resp.json()["id"]
    task_resp = manager_client.post(
        "/api/tasks/",
        {"project": project_id, "title": "Feed task"},
        format="json",
    )
    assert task_resp.status_code == 201

    actions = set(
        ActivityLog.objects.filter(user=manager).values_list("action", flat=True)
    )
    assert "project_created" in actions
    assert "task_created" in actions
