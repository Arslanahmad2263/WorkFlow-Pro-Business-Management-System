import logging

from apps.activity.models import ActivityLog

logger = logging.getLogger("apps.activity")


def record_activity(user, action, description, project=None):
    """Append an activity log entry, tolerating audit failures.

    Activity auditing must never break the primary request, so exceptions are
    logged and swallowed. ``user`` may be None for anonymous/system actions.
    """
    try:
        ActivityLog.objects.create(
            user=user,
            project=project,
            action=action,
            description=description[:255],
        )
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to record activity: action=%s", action)
