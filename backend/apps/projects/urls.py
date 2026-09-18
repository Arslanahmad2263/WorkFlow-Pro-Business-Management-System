from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.projects.views import (
    ProjectMembershipListView,
    ProjectMembershipRemoveView,
    ProjectViewSet,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")

urlpatterns = [
    *router.urls,
    path(
        "projects/<int:pk>/members/",
        ProjectMembershipListView.as_view(),
        name="project-members-list",
    ),
    path(
        "projects/<int:pk>/members/<int:user_pk>/",
        ProjectMembershipRemoveView.as_view(),
        name="project-members-remove",
    ),
]
