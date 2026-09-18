import factory
from django.contrib.auth import get_user_model

from apps.accounts.models import Role
from apps.projects.models import Project, ProjectMembership
from apps.tasks.models import Task

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = Role.EMPLOYEE

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if create:
            self.set_password(extracted or "password123")
            self.save()


class AdminFactory(UserFactory):
    role = Role.ADMIN


class ManagerFactory(UserFactory):
    role = Role.MANAGER


class EmployeeFactory(UserFactory):
    role = Role.EMPLOYEE


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Project {n}")
    description = factory.Faker("sentence")
    status = "planning"
    priority = "medium"
    created_by = factory.SubFactory(UserFactory)


class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProjectMembership

    project = factory.SubFactory(ProjectFactory)
    user = factory.SubFactory(UserFactory)
    role_in_project = ProjectMembership.RoleInProject.MEMBER


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    project = factory.SubFactory(ProjectFactory)
    title = factory.Sequence(lambda n: f"Task {n}")
    description = factory.Faker("sentence")
    status = "todo"
    priority = "medium"
    progress = 0
    created_by = factory.SubFactory(UserFactory)
