from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.projects.models import Project, ProjectMembership


class MembershipSerializer(serializers.ModelSerializer):
    """Validation for adding/removing users to a project."""

    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source="user",
        write_only=True,
    )
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMembership
        fields = ["id", "project", "user", "user_id", "role_in_project", "assigned_at"]
        read_only_fields = ["id", "project", "assigned_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        project = self.context.get("project")
        user = attrs.get("user")
        if (
            project
            and user
            and self.instance is None
            and project.memberships.filter(user=user).exists()
        ):
            raise serializers.ValidationError(
                {"user_id": "This user is already a member of the project."}
            )
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    """API representation of a project with aggregates for the dashboard/UI."""

    members = MembershipSerializer(source="memberships", many=True, read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    done_task_count = serializers.IntegerField(read_only=True)
    progress = serializers.FloatField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "status",
            "priority",
            "start_date",
            "due_date",
            "progress",
            "is_overdue",
            "task_count",
            "done_task_count",
            "members",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        due = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if start and due and start > due:
            raise serializers.ValidationError(
                {"due_date": "Due date must be on or after the start date."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
