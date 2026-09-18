from django.urls import path

from apps.analytics.views import (
    DashboardSummaryView,
    ProjectProgressReportView,
    TasksReportView,
)

urlpatterns = [
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("reports/tasks/", TasksReportView.as_view(), name="reports-tasks"),
    path(
        "reports/project-progress/",
        ProjectProgressReportView.as_view(),
        name="reports-project-progress",
    ),
]
