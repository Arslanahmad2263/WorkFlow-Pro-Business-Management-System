"""Seed a realistic demo dataset for presentations and local development.

Usage:
    python manage.py seed_demo_data

Creates an Admin, a Manager and several Employee accounts plus projects,
memberships and tasks so the dashboard/reports are populated.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.activity.services import record_activity
from apps.projects.models import Project, ProjectMembership

DEFAULT_PASSWORD = "DemoPass123!"


class Command(BaseCommand):
    help = "Seed demo users, projects, memberships and tasks."

    def handle(self, *args, **options):
        if User.objects.filter(is_staff=False).exists() and Project.objects.exists():
            self.stdout.write(self.style.WARNING("Data already present, skipping seed."))
            return

        today = timezone.localdate()

        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@workflowpro.dev",
                "first_name": "Ada",
                "last_name": "Logica",
                "role": Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password(DEFAULT_PASSWORD)
        admin.save()

        manager, _ = User.objects.get_or_create(
            username="manager",
            defaults={
                "email": "manager@workflowpro.dev",
                "first_name": "Grace",
                "last_name": "Operator",
                "role": Role.MANAGER,
            },
        )
        manager.set_password(DEFAULT_PASSWORD)
        manager.save()

        employees = []
        for name, first, last in [
            ("alice", "Alice", "Fenwick"),
            ("bob", "Bob", "Cardinal"),
            ("carol", "Carol", "Danser"),
        ]:
            user, created = User.objects.get_or_create(
                username=name,
                defaults={
                    "email": f"{name}@workflowpro.dev",
                    "first_name": first,
                    "last_name": last,
                    "role": Role.EMPLOYEE,
                },
            )
            if created:
                user.set_password(DEFAULT_PASSWORD)
                user.save()
            employees.append(user)

        projects_spec = [
            {
                "name": "Website Relaunch",
                "status": "active",
                "priority": "high",
                "start_date": today - timedelta(days=20),
                "due_date": today + timedelta(days=25),
                "members": [manager, employees[0], employees[1]],
                "tasks": [
                    ("Design new homepage", "todo", "high", 10, employees[0], 15),
                    ("Set up CMS", "in_progress", "medium", 30, employees[1], 24),
                    ("Migrate blog content", "in_progress", "medium", 60, employees[0], 40),
                    ("SEO audit", "done", "low", 100, employees[1], 8),
                ],
            },
            {
                "name": "Mobile Banking App",
                "status": "active",
                "priority": "critical",
                "start_date": today - timedelta(days=45),
                "due_date": today + timedelta(days=60),
                "members": [manager, employees[2]],
                "tasks": [
                    ("Implement login flow", "in_progress", "critical", 45, employees[2], 32),
                    ("Integrate payment API", "todo", "high", 0, employees[2], 48),
                    ("Localization for FR/DE", "in_review", "medium", 85, manager, 20),
                ],
            },
            {
                "name": "Internal Knowledge Base",
                "status": "planning",
                "priority": "low",
                "start_date": today + timedelta(days=5),
                "due_date": today + timedelta(days=40),
                "members": [manager],
                "tasks": [
                    ("Collect documentation inventory", "todo", "medium", 0, manager, 12),
                ],
            },
        ]

        for spec in projects_spec:
            project = Project.objects.create(
                name=spec["name"],
                status=spec["status"],
                priority=spec["priority"],
                start_date=spec["start_date"],
                due_date=spec["due_date"],
                created_by=manager,
            )
            for member in spec["members"]:
                ProjectMembership.objects.create(
                    project=project,
                    user=member,
                    role_in_project=ProjectMembership.RoleInProject.MANAGER
                    if member == manager
                    else ProjectMembership.RoleInProject.MEMBER,
                )
            for title, status, priority, progress, assignee, hours in spec["tasks"]:
                from apps.tasks.models import Task

                task = Task.objects.create(
                    project=project,
                    title=title,
                    status=status,
                    priority=priority,
                    progress=progress,
                    estimated_hours=hours,
                    assigned_to=assignee,
                    created_by=manager,
                    due_date=(
                        today - timedelta(days=2)
                        if status == "todo"
                        else today + timedelta(days=14)
                    ),
                )
                if status == "done":
                    task.status = "done"
                    task.save()
                record_activity(
                    manager,
                    "task_created",
                    f"Seeded task '{task.title}'",
                    project=project,
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data ready.\n"
                f"  Admin/Manager/Employees   password: {DEFAULT_PASSWORD}\n"
                "  Try: admin / manager / alice / bob / carol"
            )
        )