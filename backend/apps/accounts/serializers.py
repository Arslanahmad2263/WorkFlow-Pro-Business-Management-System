import logging

from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers

from apps.accounts.models import Role, User
from apps.activity.services import record_activity

logger = logging.getLogger("apps.accounts")


class UserSerializer(serializers.ModelSerializer):
    """Public representation of a user (safe for list/detail endpoints)."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "is_active", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    """Registration: creates an ``Employee`` by default.

    New users always start as ``employee``; Admin/Manager roles are granted by
    an existing admin (see ``/api/auth/users/`` for admin management).
    """

    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "password2",
        ]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data, role=Role.EMPLOYEE)
        user.set_password(password)
        user.save(update_fields=["password"])
        record_activity(
            user=user,
            action="account_created",
            description=f"Registered for {user.username}",
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Validate credentials and return the authenticated user for token issue."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            logger.warning("Failed login attempt for username=%s", attrs["username"])
            raise serializers.ValidationError(
                {"username": "Invalid credentials or inactive account."}
            )
        attrs["user"] = user
        return attrs


class UserUpdateSerializer(UserSerializer):
    """Used to create users or change their role (Admin only)."""

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        allow_null=True,
        trim_whitespace=False,
    )

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["password"]
