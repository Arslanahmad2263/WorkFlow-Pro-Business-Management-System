import django_filters

from apps.projects.models import Project


class ProjectFilter(django_filters.FilterSet):
    """Searchable, filterable query set for the Projects list endpoint."""

    status = django_filters.CharFilter(field_name="status")
    priority = django_filters.CharFilter(field_name="priority")
    member = django_filters.NumberFilter(
        field_name="memberships__user_id",
        distinct=True,
        label="Filter by assigned member user id",
    )
    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")

    class Meta:
        model = Project
        fields = ["status", "priority", "member", "due_before", "due_after"]
