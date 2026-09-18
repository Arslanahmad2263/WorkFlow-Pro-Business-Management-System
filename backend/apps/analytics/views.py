import logging

from django.conf import settings
from django.core.cache import cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics import services

logger = logging.getLogger("apps.analytics")

CACHE_TTL = getattr(settings, "CACHE_TTL_SECONDS", 60)


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/ — key metrics for the dashboard.

    Response is cached in Redis (keyed per user) for ``CACHE_TTL_SECONDS``.
    Aggregates are cheap enough that a short TTL keeps numbers fresh while
    absorbing dashboard page-load spikes.
    """

    @extend_schema(
        summary="Dashboard summary metrics",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        cache_key = f"analytics:dashboard:{request.user.id}"
        payload = cache.get(cache_key)
        if payload is None:
            payload = services.dashboard_summary()
            cache.set(cache_key, payload, timeout=CACHE_TTL)
            logger.debug("Dashboard summary computed (user=%s)", request.user.username)
        return Response(payload)


class TasksReportView(APIView):
    """GET /api/reports/tasks/?days=30 — task completion report."""

    @extend_schema(
        summary="Task completion report",
        parameters=[
            OpenApiParameter(
                name="days",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Reporting window in days (1-365).",
                default=30,
            )
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        days = request.query_params.get("days", 30)
        try:
            days = int(days)
            if days < 1 or days > 365:
                raise ValueError
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                {"days": "days must be an integer between 1 and 365."}
            ) from None

        cache_key = f"analytics:tasks-report:{days}"
        payload = cache.get(cache_key)
        if payload is None:
            payload = services.tasks_report(days=days)
            cache.set(cache_key, payload, timeout=CACHE_TTL)
        return Response(payload)


class ProjectProgressReportView(APIView):
    """GET /api/reports/project-progress/ — progress per project."""

    @extend_schema(
        summary="Per-project progress report",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        cache_key = "analytics:project-progress"
        payload = cache.get(cache_key)
        if payload is None:
            payload = services.project_progress_report()
            cache.set(cache_key, payload, timeout=CACHE_TTL)
        return Response(payload)