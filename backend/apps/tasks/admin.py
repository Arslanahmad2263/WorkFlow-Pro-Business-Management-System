from django.contrib import admin

from apps.tasks.models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "priority", "assigned_to", "progress", "due_date")
    list_filter = ("status", "priority", "project", "due_date")
    search_fields = ("title", "description")
    readonly_fields = ("completed_at",)
    date_hierarchy = "due_date"
