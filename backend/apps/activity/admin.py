from django.contrib import admin

from apps.activity.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "description", "created_at")
    list_filter = ("action", "created_at")
    readonly_fields = ("user", "project", "action", "description", "created_at")
    search_fields = ("description", "user__username")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
