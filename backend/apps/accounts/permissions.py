from rest_framework.permissions import BasePermission

from apps.accounts.models import Role


class IsAdmin(BasePermission):
    """Allow access only to users with the ``admin`` role."""

    message = "Admin role required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.ADMIN
        )


class IsManager(BasePermission):
    """Allow access only to users with the ``manager`` or ``admin`` role."""

    message = "Manager role required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager())


class IsAdminOrManager(BasePermission):
    """Admin and Manager can write; authenticated users can read."""

    message = "Admin or manager role required to modify this resource."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.is_manager()
