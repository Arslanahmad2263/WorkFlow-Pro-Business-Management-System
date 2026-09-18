"""Consistent JSON error handling for the WorkFlow-Pro API.

Every error response is normalized to a predictable envelope so the frontend
and API consumers always know how to read failures::

    HTTP 400
    {
      "type": "validation_error",
      "detail": { "title": ["This field is required."] }
    }

    HTTP 404
    {
      "type": "not_found",
      "detail": "No Project matches the given query."
    }

Stack traces are never leaked to clients. Unhandled exceptions are logged by
Django and returned as a generic, safe 500 message.
"""

import logging

from django.core.exceptions import (
    PermissionDenied as DjangoPermissionDenied,
)
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.views import exception_handler

logger = logging.getLogger("apps.core.exceptions")

_ERROR_TYPE_MAP = {
    drf_exceptions.ValidationError: "validation_error",
    drf_exceptions.AuthenticationFailed: "authentication_error",
    drf_exceptions.NotAuthenticated: "authentication_error",
    drf_exceptions.PermissionDenied: "permission_denied",
    drf_exceptions.NotFound: "not_found",
    drf_exceptions.MethodNotAllowed: "method_not_allowed",
    Http404: "not_found",
    DjangoPermissionDenied: "permission_denied",
}


def api_exception_handler(exc, context):
    """Wrap DRF and Django exceptions into a consistent ``{type, detail}`` body."""

    response = exception_handler(exc, context)

    if response is None:
        logger.exception("Unhandled API exception: %s", exc)
        return _build_internal_response()

    error_type = _ERROR_TYPE_MAP.get(type(exc), "error")
    response.data = _normalize(response.data, error_type)
    return response


def _normalize(detail, error_type):
    if isinstance(detail, dict):
        normalized = dict(detail)
        if "non_field_errors" in normalized:
            normalized = {"non_field_errors": normalized["non_field_errors"]}
        return {"type": error_type, "detail": normalized}
    if isinstance(detail, (list, tuple)):
        return {"type": error_type, "detail": detail}
    return {"type": error_type, "detail": detail}


def _build_internal_response():
    from rest_framework.response import Response

    return Response(
        {"type": "internal_error", "detail": "An unexpected error occurred."},
        status=500,
    )
