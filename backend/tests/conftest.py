import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from tests.factories import AdminFactory, EmployeeFactory, ManagerFactory


def _auth_client(user) -> APIClient:
    from rest_framework_simplejwt.tokens import RefreshToken

    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client


@pytest.fixture(autouse=True)
def _use_locmem_cache():
    """Use LocMem cache in tests so Redis is never required. Clears per test."""
    from django.test import override_settings

    with override_settings(
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "workflow-test-cache",
            }
        },
        PASSWORD_HASHERS=[
            "django.contrib.auth.hashers.PBKDF2PasswordHasher",
        ],
    ):
        cache.clear()
        yield


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin():
    return AdminFactory(username="admin")


@pytest.fixture
def manager():
    return ManagerFactory(username="manager")


@pytest.fixture
def employee():
    return EmployeeFactory(username="employee")


@pytest.fixture
def admin_client(admin):
    return _auth_client(admin)


@pytest.fixture
def manager_client(manager):
    return _auth_client(manager)


@pytest.fixture
def employee_client(employee):
    return _auth_client(employee)


@pytest.fixture
def users():
    """admin, manager and employee as plain users (no auth)."""
    from tests.factories import AdminFactory, EmployeeFactory, ManagerFactory

    return {
        "admin": AdminFactory(username="admin"),
        "manager": ManagerFactory(username="manager"),
        "employee": EmployeeFactory(username="employee"),
    }
