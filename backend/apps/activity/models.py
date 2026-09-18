from django.conf import settings
from django.db import models


class ActivityLog(models.Model):

    class Action(models.TextChoices):
        ACCOUNT_CREATED = "account_created", "Account created"
        PROJECT_CREATED = "project_created", "Project created"
        PROJECT_UPDATED = "project_updated", "Project updated"
        PROJECT_COMPLETED = "project_completed", "Project completed"
        MEMBER_ADDED = "member_added", "Member added"
        MEMBER_REMOVED = "member_removed", "Member removed"
        TASK_CREATED = "task_created", "Task created"
        TASK_UPDATED = "task_updated", "Task updated"
        TASK_STATUS_CHANGED = "task_status_changed", "Task status changed"
        TASK_ASSIGNED = "task_assigned", "Task assigned"
        TASK_COMPLETED = "task_completed", "Task completed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="activities",)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, null=True, blank=True, related_name="activities",)
    action = models.CharField(max_length=40, choices=Action.choices)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project", "-created_at"])]
        verbose_name_plural = "activity logs"

    def __str__(self) -> str:
        return f"{self.user} {self.get_action_display()} @ {self.created_at:%Y-%m-%d %H:%M}"
