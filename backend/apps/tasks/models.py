import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class TaskStatus(models.TextChoices):
    TODO = "todo", _("To do")
    IN_PROGRESS = "in_progress", _("In progress")
    IN_REVIEW = "in_review", _("In review")
    DONE = "done", _("Done")


class TaskPriority(models.TextChoices):
    LOW = "low", _("Low")
    MEDIUM = "medium", _("Medium")
    HIGH = "high", _("High")
    CRITICAL = "critical", _("Critical")


def validate_progress(value):
    if not 0 <= value <= 100:
        raise ValidationError(_("Progress must be between 0 and 100."))


def task_attachment_path(instance, filename):
    """Store attachments under ``attachments/{user}/{timestamp}_{filename}``."""
    safe_name = os.path.basename(filename)
    return f"attachments/{instance.created_by_id or 'unknown'}/{timezone.now():%Y%m%d%H%M%S}_{safe_name}"


class Task(models.Model):
    """A work item belonging to a project with priority, deadline and progress."""

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    progress = models.PositiveSmallIntegerField(default=0, validators=[validate_progress])
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    attachment = models.FileField(upload_to=task_attachment_path, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="tasks_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["due_date"]),
            models.Index(fields=["priority"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"

    def is_overdue(self) -> bool:
        return bool(
            self.due_date
            and self.status != TaskStatus.DONE
            and self.due_date < timezone.localdate()
        )

    def save(self, *args, **kwargs):
        if self.status == TaskStatus.DONE:
            self.progress = 100
            if not self.completed_at:
                self.completed_at = timezone.now()
        else:
            self.completed_at = None
            if self.progress >= 100:
                self.progress = 99
        super().save(*args, **kwargs)
