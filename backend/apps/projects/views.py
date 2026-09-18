import logging

from django.db.models import (
    Avg,
    BooleanField,
    Case,
    Count,
    FloatField,
    Q,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, viewsets

from apps.accounts.permissions import IsAdminOrManager
from apps.activity.services import record_activity
from apps.projects.filters import ProjectFilter
from apps.projects.models import Project, ProjectMembership, ProjectStatus
from apps.projects.serializers import MembershipSerializer, ProjectSerializer

logger = logging.getLogger("apps.projects")


def _annotated_projects():
    """Base queryset with the computed aggregates used by the serializer."""
    done_score = Case(
        When(tasks__status="done", then=Value(1.0)),
        default=Value(0.0),
        output_field=FloatField(),
    )
    is_overdue_expr = Case(
        When(status=ProjectStatus.COMPLETED, then=Value(False)),
        When(
            Q(due_date__isnull=False) & Q(due_date__lt=timezone.localdate()),
            then=Value(True),
        ),
        default=Value(False),
        output_field=BooleanField(),
    )
    return (
        Project.objects.annotate(
            task_count=Count("tasks", distinct=True),
            done_task_count=Count("tasks", filter=Q(tasks__status="done"), distinct=True),
            progress=Coalesce(Avg(done_score) * 100.0, Value(0.0)),
            is_overdue=is_overdue_expr,
        )
        .prefetch_related("memberships__user", "tasks")
        .select_related("created_by")
    )


class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD API for projects.

    * Admin / Manager — full access.
    * Employee — read-only access.
    """

    serializer_class = ProjectSerializer
    filterset_class = ProjectFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "due_date", "priority", "status"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permission() for permission in self.permission_classes]
        return [IsAdminOrManager()]

    def get_queryset(self):
        return _annotated_projects()

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        project = serializer.save()
        if old_status != project.status and project.status == ProjectStatus.COMPLETED:
            record_activity(
                self.request.user,
                "project_completed",
                f"Project '{project.name}' marked as completed",
                project=project,
            )
        else:
            record_activity(
                self.request.user,
                "project_updated",
                f"Updated project '{project.name}'",
                project=project,
            )
        logger.info("User=%s updated project=%s", self.request.user.username, project.name)

    def perform_create(self, serializer):
        project = serializer.save()
        record_activity(
            self.request.user,
            "project_created",
            f"Created project '{project.name}'",
            project=project,
        )


class ProjectMembershipListView(generics.ListCreateAPIView):
    """GET/POST /api/projects/{pk}/members/ — add or list project members."""

    serializer_class = MembershipSerializer
    permission_classes = [IsAdminOrManager]
    queryset = ProjectMembership.objects.all()

    @property
    def project(self):
        from django.shortcuts import get_object_or_404

        return get_object_or_404(Project, pk=self.kwargs["pk"])

    def get_queryset(self):
        return (
            ProjectMembership.objects.filter(project_id=self.kwargs["pk"])
            .select_related("user")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["project"] = self.project
        return context

    def perform_create(self, serializer):
        membership = serializer.save(project=self.project)
        record_activity(
            self.request.user,
            "member_added",
            f"Added {membership.user.username} to '{self.project.name}'",
            project=self.project,
        )


class ProjectMembershipRemoveView(generics.DestroyAPIView):
    """DELETE /api/projects/{pk}/members/{user_pk}/ — remove a project member."""

    queryset = ProjectMembership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [IsAdminOrManager]
    http_method_names = ["delete"]

    @property
    def project(self):
        return get_object_or_404(Project, pk=self.kwargs["pk"])

    def get_object(self):
        return get_object_or_404(
            self.get_queryset(),
            project_id=self.kwargs["pk"],
            user_id=self.kwargs["user_pk"],
        )

    def perform_destroy(self, instance):
        user = instance.user
        project = instance.project
        instance.delete()
        record_activity(
            self.request.user,
            "member_removed",
            f"Removed {user.username} from '{project.name}'",
            project=project,
        )
