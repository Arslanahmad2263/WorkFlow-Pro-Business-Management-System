from django.contrib import admin

from apps.projects.models import Project, ProjectMembership


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "priority", "due_date", "created_by", "created_at")
    list_filter = ("status", "priority", "created_at")
    search_fields = ("name", "description")
    date_hierarchy = "due_date"

    def is_overdue(self, obj):
        return obj.is_overdue()

    is_overdue.boolean = True


@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "role_in_project", "assigned_at")
    list_filter = ("role_in_project",)
