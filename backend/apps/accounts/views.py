import logging

from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin
from apps.accounts.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from rest_framework import serializers

logger = logging.getLogger("apps.accounts")


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — create a new employee account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = "anon"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        logger.info("New account created: %s", user.username)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(views.APIView):
    """POST /api/auth/login/ — exchange credentials for JWT tokens."""

    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_scope = "anon"

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        logger.info("User=%s logged in", user.username)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        )


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — rotate/refresh tokens."""


class LogoutView(views.APIView):
    """POST /api/auth/logout/ — blacklist the supplied refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            "LogoutRequest",
            fields={"refresh": serializers.CharField()},
        ),
        responses={
            204: OpenApiResponse(description="Successfully logged out"),
            400: OpenApiResponse(description="Missing or invalid refresh token"),
        },
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"type": "validation_error", "detail": {"refresh": "This field is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as exc:
            logger.warning("Logout with invalid refresh token: %s", exc)
            return Response(
                {"type": "validation_error", "detail": {"refresh": "Invalid refresh token."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        logger.info("User=%s logged out", request.user.username)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — current user profile."""

    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListCreateAPIView):
    """GET/POST /api/auth/users/ — list or create users (Admin only)."""

    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdmin]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "email", "date_joined", "role"]
    ordering = ["username"]

    def get_queryset(self):
        return User.objects.all()

    def perform_create(self, serializer):
        password = serializer.validated_data.pop("password", None)
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        logger.info("Admin=%s created user=%s role=%s", self.request.user.username, user.username, user.role)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/{id}/ — manage a user (Admin only)."""

    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    http_method_names = ["get", "patch", "delete"]

    def perform_update(self, serializer):
        password = serializer.validated_data.pop("password", None)
        user = serializer.save()
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"type": "validation_error", "detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        logger.info("Admin=%s deleted user=%s", request.user.username, instance.username)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActiveUserListView(generics.ListAPIView):
    """GET /api/auth/users/active/ — active users for assignee dropdowns.

    Any authenticated user may read this list so Managers can assign tasks.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(is_active=True).order_by("username")
