from django.urls import path

from apps.accounts.views import (
    ActiveUserListView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("users/", UserListView.as_view(), name="auth-users"),
    path("users/active/", ActiveUserListView.as_view(), name="auth-users-active"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="auth-user-detail"),
]
