from django.conf import settings
from django.db import models
from django.utils import timezone


class ProjectStatus(models.TextChoices):
    PLANNING = "planning", "Planning"
    ACTIVE = "active", "Active"
    ON_HOLD = "on_hold", "On hold"
    COMPLETED = "completed", "Completed"


class ProjectPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class Project(models.Model):
    """A container for tasks allocated to a delivery goal."""

    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.PLANNING,
    )
    priority = models.CharField(
        max_length=20,
        choices=ProjectPriority.choices,
        default=ProjectPriority.MEDIUM,
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="projects_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self) -> str:
        return self.name

    def is_overdue(self) -> bool:
        return bool(
            self.due_date
            and self.status != ProjectStatus.COMPLETED
            and self.due_date < timezone.localdate()
        )

    def progress(self) -> float:
        """Project progress as the weighted percentage of done tasks."""
        tasks = self.tasks.all()
        if not tasks:
            return 0.0
        done = sum(1 for t in tasks if t.status == "done")
        return round(done * 100.0 / tasks.count(), 1)


class ProjectMembership(models.Model):
    """Association of a user to a project with a per-project role."""

    class RoleInProject(models.TextChoices):
        MANAGER = "manager", "Project manager"
        MEMBER = "member", "Member"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role_in_project = models.CharField(
        max_length=20,
        choices=RoleInProject.choices,
        default=RoleInProject.MEMBER,
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-role_in_project", "user__username"]
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="unique_project_member")
        ]

    def __str__(self) -> str:
        return f"{self.user} — {self.project} ({self.get_role_in_project_display()})"
