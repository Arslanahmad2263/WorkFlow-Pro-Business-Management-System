import logging

from django.db.models import BooleanField, Case, Q, Value, When
from django.utils import timezone
from rest_framework import permissions, viewsets

from apps.accounts.permissions import IsAdminOrManager
from apps.activity.services import record_activity
from apps.tasks.filters import TaskFilter
from apps.tasks.models import Task, TaskStatus
from apps.tasks.serializers import TaskSerializer

logger = logging.getLogger("apps.tasks")


class TaskViewSet(viewsets.ModelViewSet):
    """CRUD API for tasks.

    * Admin / Manager — create, edit and delete any task.
    * Employee — read all tasks; may update the status/progress of tasks
      assigned to them; cannot create or delete.
    """

    serializer_class = TaskSerializer
    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "due_date", "priority", "status", "title"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAdminOrManager()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        is_overdue = Case(
            When(status=TaskStatus.DONE, then=Value(False)),
            When(
                Q(due_date__isnull=False) & Q(due_date__lt=timezone.localdate()),
                then=Value(True),
            ),
            default=Value(False),
            output_field=BooleanField(),
        )
        return Task.objects.annotate(is_overdue=is_overdue).select_related(
            "project", "assigned_to", "created_by"
        )

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Employees may edit (PATCH) only tasks assigned to them and cannot delete.
        if (
            request.method == "PATCH"
            and not request.user.is_manager()
            and obj.assigned_to_id != request.user.id
        ):
            self.permission_denied(
                request,
                message="You can only update tasks assigned to you.",
                code=403,
            )

    def perform_create(self, serializer):
        task = serializer.save()
        record_activity(
            self.request.user,
            "task_created",
            f"Created task '{task.title}' in '{task.project.name}'",
            project=task.project,
        )
        logger.info("User=%s created task=%s", self.request.user.username, task.title)

    def perform_update(self, serializer):
        old = serializer.instance
        task = serializer.save()
        changes = []
        if old.status != task.status:
            changes.append(f"status → {task.get_status_display()}")
        if old.assigned_to_id != task.assigned_to_id:
            changes.append(
                f"assigned to {task.assigned_to.username if task.assigned_to else 'nobody'}"
            )
        action = "task_completed" if task.status == TaskStatus.DONE else "task_updated"
        description = (
            f"Task '{task.title}': {', '.join(changes)}"
            if changes
            else f"Updated task '{task.title}'"
        )
        record_activity(self.request.user, action, description, project=task.project)

    def perform_destroy(self, instance):
        project = instance.project
        record_activity(
            self.request.user,
            "task_updated",
            f"Deleted task '{instance.title}'",
            project=project,
        )
        instance.delete()
