import re
from datetime import date, datetime, time

from flask import request

from .errors import ApiError

EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PHONE_PATTERN = re.compile(r"^\+?[0-9 ]{7,20}$")
TIME_PATTERN = re.compile(r"^([01][0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$")


def json_body():
    if not request.is_json:
        raise ApiError("Send the request as JSON.", 400, "invalid_content_type")
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Send a JSON object in the request body.", 400, "invalid_body")
    return data


def required_text(data, key, label, min_length=1, max_length=2000):
    value = data.get(key)
    if value is None or not isinstance(value, str) or not value.strip():
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {key: f"{label} is required."},
        )
    value = value.strip()
    if len(value) < min_length:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {key: f"{label} must be at least {min_length} characters."},
        )
    if len(value) > max_length:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {key: f"{label} must be {max_length} characters or fewer."},
        )
    return value


def optional_text(data, key, label, max_length=2000):
    value = data.get(key)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {key: f"{label} must be text."},
        )
    value = value.strip()
    if not value:
        return None
    if len(value) > max_length:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {key: f"{label} must be {max_length} characters or fewer."},
        )
    return value


def validate_email(value):
    value = (value or "").strip().lower()
    if not value or len(value) > 190 or not EMAIL_PATTERN.match(value):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"email": "Enter a valid email address."},
        )
    return value


def validate_password(value):
    if not isinstance(value, str) or len(value) < 8 or len(value) > 128:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"password": "Password must be between 8 and 128 characters."},
        )
    if not re.search(r"[A-Za-z]", value) or not re.search(r"[0-9]", value):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"password": "Password must include at least one letter and one number."},
        )
    return value


def validate_phone(value):
    value = (value or "").strip()
    if not PHONE_PATTERN.match(value):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"phone": "Enter a phone number using 7 to 20 digits, spaces, or a leading plus sign."},
        )
    return value


def validate_name(value, field="name", label="Name"):
    if not isinstance(value, str) or len(value.strip()) < 2 or len(value.strip()) > 120:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must be between 2 and 120 characters."},
        )
    return value.strip()


def parse_int(value, field, label, minimum=None, maximum=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must be a whole number."},
        )
    if minimum is not None and number < minimum:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must be at least {minimum}."},
        )
    if maximum is not None and number > maximum:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must be at most {maximum}."},
        )
    return number


def parse_date(value, field, label):
    if not isinstance(value, str) or not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must use the format YYYY MM DD."},
        )
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} is not a valid date."},
        )


def parse_time(value, field, label):
    if not isinstance(value, str) or not TIME_PATTERN.match(value):
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} must use the format HH:MM."},
        )
    parts = value.split(":")
    return time(int(parts[0]), int(parts[1]))


def parse_local_datetime(value, field, label):
    if not isinstance(value, str) or not value.strip():
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} is required."},
        )
    text = value.strip().replace(" ", "T")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"{label} is not a valid date and time."},
        )
    if parsed.tzinfo is not None:
        parsed = parsed.replace(tzinfo=None)
    return parsed


def parse_enum(value, allowed, field, label):
    if value not in allowed:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {field: f"Choose a valid {label}."},
        )
    return value


def parse_bool(value, field, label):
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.lower() in {"true", "false"}:
        return value.lower() == "true"
    raise ApiError(
        "Please correct the highlighted fields.",
        400,
        "validation_error",
        {field: f"{label} must be true or false."},
    )


def pagination_args(default_per_page=10):
    page = request.args.get("page", 1, type=int) or 1
    per_page = request.args.get("per_page", default_per_page, type=int) or default_per_page
    page = max(1, page)
    per_page = max(1, min(50, per_page))
    return page, per_page


def pagination_payload(page, per_page, total):
    pages = (total + per_page - 1) // per_page if total else 0
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages,
        "has_next": page < pages,
        "has_prev": page > 1,
    }
