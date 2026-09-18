from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    ADMIN = "admin", _("Admin")
    MANAGER = "manager", _("Manager")
    EMPLOYEE = "employee", _("Employee")


class User(AbstractUser):
    """WorkFlow-Pro user with role-based access control.

    Roles are intentionally stored on the user model rather than as a separate
    permission table: the system has a small, well-defined set of roles
    (Admin, Manager, Employee) which keeps authorization checks simple and fast.
    """

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )
    email = models.EmailField(_("email address"), unique=True)

    class Meta:
        ordering = ["username"]

    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    def is_manager(self) -> bool:
        return self.role in (Role.ADMIN, Role.MANAGER)

    def __str__(self) -> str:
        return f"{self.username} ({self.get_role_display()})"
