"""Read models that compute the dashboard and report payloads.

All functions are pure (no side effects) so they are easy to unit test and
safe to run inside a cached read path.
"""

from collections import Counter
from datetime import timedelta

from django.db.models import Avg, Count
from django.utils import timezone

from apps.accounts.models import User
from apps.activity.models import ActivityLog
from apps.projects.models import Project, ProjectStatus
from apps.tasks.models import Task, TaskStatus

STATUS_ORDER = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE]


def dashboard_summary() -> dict:
    """Aggregated metrics for the landing dashboard."""
    today = timezone.localdate()
    week_ago = timezone.now() - timedelta(days=7)

    projects = Project.objects.all()
    tasks = Task.objects.all()

    task_status_counts = dict(tasks.values_list('status').annotate(n=Count('id')))
    task_status = {s: task_status_counts.get(s, 0) for s in STATUS_ORDER}
    project_status_counts = dict(
        projects.values_list("status").annotate(n=Count("id")).values_list("status", "n")
    )
    project_status = {
        status: project_status_counts.get(status, 0)
        for status in (
            ProjectStatus.PLANNING,
            ProjectStatus.ACTIVE,
            ProjectStatus.ON_HOLD,
            ProjectStatus.COMPLETED,
        )
    }
    overdue_tasks = (
        tasks.filter(due_date__isnull=False, due_date__lt=today)
        .exclude(status=TaskStatus.DONE)
        .count()
    )
    overdue_projects = (
        projects.filter(due_date__isnull=False, due_date__lt=today)
        .exclude(status=ProjectStatus.COMPLETED)
        .count()
    )
    completed_recent = tasks.filter(
        status=TaskStatus.DONE, completed_at__gte=week_ago
    ).count()

    upcoming_deadlines = list(
        tasks.filter(due_date__isnull=False, due_date__gte=today)
        .exclude(status=TaskStatus.DONE)
        .order_by("due_date")[:5]
        .values("id", "title", "due_date", "status")
    )

    recent_activity = list(
        ActivityLog.objects.select_related("user", "project")
        .order_by("-created_at")[:8]
        .values("id", "action", "description", "created_at", "user__username")
    )

    return {
        "projects": {
            "total": projects.count(),
            "by_status": project_status,
        },
        "tasks": {
            "total": tasks.count(),
            "by_status": task_status,
            "overdue": overdue_tasks,
            "completed_last_7_days": completed_recent,
        },
        "overdue_projects": overdue_projects,
        "members": User.objects.filter(is_active=True).count(),
        "upcoming_deadlines": upcoming_deadlines,
        "recent_activity": recent_activity,
    }


def tasks_report(days: int = 30) -> dict:
    """Report over task completion, overdue items and priority breakdown."""
    today = timezone.localdate()
    since = today - timedelta(days=max(days, 1))

    tasks = Task.objects.all()
    completed = tasks.filter(status=TaskStatus.DONE, completed_at__date__gte=since)
    done_total = completed.count()

    priority_counter = Counter(
        tasks.filter(
            status=TaskStatus.DONE, completed_at__date__gte=since
        ).values_list("priority", flat=True)
    )
    total_by_priority = dict(
        tasks.values_list("priority").annotate(count=Count("id"))
    )
    completion_rate_by_priority = {}
    for priority in ("low", "medium", "high", "critical"):
        total = total_by_priority.get(priority, 0)
        done = priority_counter.get(priority, 0)
        completion_rate_by_priority[priority] = (
            round(done / total * 100, 1) if total else 0.0
        )

    overdue_tasks = (
        tasks.filter(due_date__isnull=False, due_date__lt=today)
        .exclude(status=TaskStatus.DONE)
    )

    avg_progress_by_status = {}
    for status in STATUS_ORDER:
        agg = tasks.filter(status=status).aggregate(avg=Avg("progress"))
        avg_progress_by_status[status] = round(agg["avg"] or 0.0, 1)

    return {
        "period_days": days,
        "completed_tasks": done_total,
        "overdue_tasks": overdue_tasks.count(),
        "overdue_task_ids": list(
            overdue_tasks.order_by("due_date").values_list("id", flat=True)[:50]
        ),
        "completion_rate_by_priority": completion_rate_by_priority,
        "avg_progress_by_status": avg_progress_by_status,
    }


def project_progress_report() -> list:
    """Per-project progress, task distribution and overdue flags."""
    rows = []
    for project in Project.objects.prefetch_related("tasks", "memberships__user"):
        project_tasks = list(project.tasks.all())
        total = len(project_tasks)
        done = sum(1 for t in project_tasks if t.status == TaskStatus.DONE)
        overdue = sum(1 for t in project_tasks if t.is_overdue())
        rows.append(
            {
                "id": project.id,
                "name": project.name,
                "status": project.status,
                "progress": round(done * 100.0 / total, 1) if total else 0.0,
                "task_count": total,
                "done_task_count": done,
                "overdue_tasks": overdue,
                "overdue": project.is_overdue(),
                "due_date": project.due_date.isoformat() if project.due_date else None,
                "member_count": project.memberships.count(),
            }
        )
    return rows
