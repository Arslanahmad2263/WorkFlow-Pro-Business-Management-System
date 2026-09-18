import os

from django.conf import settings
from rest_framework import serializers

from apps.tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    """API representation of a task with validation for business rules."""

    project_name = serializers.CharField(source="project.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    attachment_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "estimated_hours",
            "progress",
            "assigned_to",
            "assigned_to_name",
            "attachment",
            "attachment_url",
            "created_by",
            "created_by_name",
            "completed_at",
            "created_at",
            "updated_at",
            "is_overdue",
        ]
        read_only_fields = [
            "id",
            "project_name",
            "created_by",
            "completed_at",
            "created_at",
            "updated_at",
            "is_overdue",
        ]
        extra_kwargs = {
            "attachment": {"write_only": True, "required": False, "allow_null": True},
            "project": {"required": True},
        }

    def get_assigned_to_name(self, obj) -> str | None:
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None

    def get_attachment_url(self, obj) -> str | None:
        request = self.context.get("request")
        if obj.attachment:
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None

    def validate_progress(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Progress must be between 0 and 100.")
        return value

    def validate_estimated_hours(self, value):
        if value < 0:
            raise serializers.ValidationError("Estimated hours cannot be negative.")
        return value

    def validate_attachment(self, value):
        max_size = getattr(settings, "MAX_ATTACHMENT_SIZE_MB", 5) * 1024 * 1024
        if value and value.size > max_size:
            raise serializers.ValidationError(
                f"Attachment exceeds the maximum size of {max_size // (1024 * 1024)} MB."
            )
        allowed = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".txt", ".docx", ".xlsx", ".csv", ".md"}
        ext = os.path.splitext(value.name)[1].lower() if value else ""
        if value and ext not in allowed:
            raise serializers.ValidationError(
                f"Attachment type '.{ext or 'unknown'}' is not allowed. "
                f"Allowed: {', '.join(sorted(allowed))}."
            )
        return value

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        status = attrs.get("status", getattr(self.instance, "status", None))
        progress = attrs.get("progress", getattr(self.instance, "progress", 0))

        if status == "done" and progress < 100:
            raise serializers.ValidationError(
                {"status": "A task cannot be marked done before progress reaches 100%."}
            )
        if project and assigned_to and not project.memberships.filter(user=assigned_to).exists():
            raise serializers.ValidationError(
                {"assigned_to": "The assignee must be a member of this project."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
