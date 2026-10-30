import hashlib
import hmac
import secrets
from datetime import date
from functools import wraps

from flask import Blueprint, current_app, jsonify, request, session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.security import check_password_hash, generate_password_hash

from .errors import ApiError
from .extensions import db
from .models import (
    ADMIN_SETUP_KEY,
    BLOOD_GROUPS,
    GENDERS,
    Patient,
    System_Setting,
    User_Account,
    utcnow,
)
from .serializers import serialize_user
from .services.availability import hospital_now
from .validation import (
    json_body,
    optional_text,
    parse_date,
    reject_forbidden_fields,
    required_text,
    validate_email,
    validate_name,
    validate_password,
    validate_phone,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
CSRF_SESSION_KEY = "csrf_token"
CREDENTIAL_SESSION_KEY = "credential_fingerprint"


def credential_fingerprint(user):
    """Return a stable fingerprint of the current password hash."""
    return hashlib.sha256(user.password_hash.encode("utf-8")).hexdigest()


def ensure_csrf_token():
    token = session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token
    return token


def rotate_csrf_token():
    token = secrets.token_urlsafe(32)
    session[CSRF_SESSION_KEY] = token
    return token


def csrf_protect():
    """Reject state changing API requests without the session CSRF token."""
    if not current_app.config.get("CSRF_ENABLED", True):
        return None
    if request.method in SAFE_METHODS or not request.path.startswith("/api/"):
        return None
    expected = session.get(CSRF_SESSION_KEY)
    supplied = request.headers.get("X-CSRF-Token", "")
    if not expected or not supplied or not hmac.compare_digest(str(expected), str(supplied)):
        return (
            jsonify(
                {
                    "error": "Your security token is missing or expired. Refresh the page and try again.",
                    "code": "csrf_failed",
                }
            ),
            403,
        )
    return None


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = db.session.get(User_Account, user_id)
    if user is None:
        session.clear()
        ensure_csrf_token()
        return None
    if session.get(CREDENTIAL_SESSION_KEY) != credential_fingerprint(user):
        # A password change or a restored database invalidates older sessions.
        session.clear()
        ensure_csrf_token()
        return None
    return user


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            raise ApiError("Please sign in to continue.", 401, "authentication_required")
        if not user.is_active:
            session.clear()
            ensure_csrf_token()
            raise ApiError("This account is inactive. Contact the hospital administrator.", 403, "inactive_account")
        return view(*args, **kwargs)

    return wrapped


def role_required(*roles):
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if user.role not in roles:
                raise ApiError("You do not have permission to perform this action.", 403, "forbidden")
            return view(*args, **kwargs)

        return wrapped

    return decorator


def start_session(user):
    session.clear()
    session["user_id"] = user.user_id
    session[CREDENTIAL_SESSION_KEY] = credential_fingerprint(user)
    session.permanent = True
    return rotate_csrf_token()


def setup_completed():
    try:
        marker = db.session.get(System_Setting, ADMIN_SETUP_KEY)
    except SQLAlchemyError:
        # Older databases may not have the system_setting table yet. The
        # administrator row still closes setup so it cannot run twice.
        db.session.rollback()
        return User_Account.query.filter_by(role="admin").first() is not None
    if marker is not None:
        return True
    return User_Account.query.filter_by(role="admin").first() is not None


def mark_setup_completed(value="completed"):
    try:
        with db.session.begin_nested():
            marker = db.session.get(System_Setting, ADMIN_SETUP_KEY)
            if marker is None:
                db.session.add(
                    System_Setting(setting_key=ADMIN_SETUP_KEY, setting_value=value)
                )
    except SQLAlchemyError:
        # Keep the administrator account usable until the pending migration
        # creates system_setting. The administrator row still closes setup.
        current_app.logger.warning(
            "Could not record the administrator setup marker. Apply the pending database migration."
        )


@auth_bp.get("/csrf")
def csrf_token():
    """Issue a session bound CSRF token for the browser client."""
    return jsonify({"csrf_token": ensure_csrf_token()})


@auth_bp.get("/setup-status")
def setup_status():
    """Report whether first time administrator setup is still possible."""
    completed = setup_completed()
    return jsonify(
        {
            "setup_required": not completed,
            "setup_completed": completed,
            "setup_available": bool(current_app.config.get("ADMIN_SETUP_SECRET")),
            "admin_exists": User_Account.query.filter_by(role="admin").first() is not None,
        }
    )


@auth_bp.post("/setup-admin")
def setup_admin():
    """Create the first administrator exactly once, guarded by an environment secret."""
    if setup_completed():
        raise ApiError(
            "Administrator setup is already complete. Sign in with the existing administrator account.",
            409,
            "setup_completed",
        )

    secret = current_app.config.get("ADMIN_SETUP_SECRET") or ""
    if len(secret) < 16:
        raise ApiError(
            "Administrator setup is not configured. Set ADMIN_SETUP_SECRET in the backend environment.",
            503,
            "setup_unavailable",
        )

    data = json_body()
    reject_forbidden_fields(
        data,
        {"role", "user_id", "patient_id", "doctor_id", "is_active", "username", "password_hash"},
    )
    supplied = data.get("setup_secret")
    if not isinstance(supplied, str) or not hmac.compare_digest(supplied, secret):
        raise ApiError("The setup secret is incorrect.", 403, "invalid_setup_secret")

    email = validate_email(data.get("email"))
    password = validate_password(data.get("password"))
    confirm_password = data.get("confirm_password")
    if confirm_password != password:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"confirm_password": "Passwords do not match."},
        )

    if User_Account.query.filter_by(username=email).first():
        raise ApiError("An account with this email already exists.", 409, "duplicate_email")

    account = User_Account(
        username=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256:600000"),
        role="admin",
        is_active=True,
    )
    db.session.add(account)
    mark_setup_completed(utcnow().isoformat())
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("Administrator setup is already complete.", 409, "setup_completed")

    token = start_session(account)
    return (
        jsonify(
            {
                "message": "Administrator account created.",
                "user": serialize_user(account),
                "csrf_token": token,
            }
        ),
        201,
    )


@auth_bp.post("/register")
def register():
    data = json_body()
    reject_forbidden_fields(
        data,
        {"role", "user_id", "patient_id", "doctor_id", "is_active", "username", "password_hash"},
    )
    name = validate_name(data.get("name"))
    email = validate_email(data.get("email"))
    password = validate_password(data.get("password"))
    date_of_birth = parse_date(data.get("date_of_birth"), "date_of_birth", "Date of birth")
    if date_of_birth > hospital_now().date():
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"date_of_birth": "Date of birth cannot be in the future."},
        )
    if date_of_birth.year < date.today().year - 120:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"date_of_birth": "Enter a realistic date of birth."},
        )
    gender = data.get("gender")
    if gender not in GENDERS:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"gender": "Choose a valid gender option."},
        )
    phone = validate_phone(data.get("phone"))
    address = optional_text(data, "address", "Address", max_length=255)
    blood_group = data.get("blood_group") or "Unknown"
    if blood_group not in BLOOD_GROUPS:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"blood_group": "Choose a valid blood group."},
        )
    medical_history = optional_text(data, "medical_history", "Medical history", max_length=2000)

    if User_Account.query.filter_by(username=email).first():
        raise ApiError("An account with this email already exists.", 409, "duplicate_email")

    patient = Patient(
        name=name,
        date_of_birth=date_of_birth,
        gender=gender,
        phone=phone,
        address=address,
        blood_group=blood_group,
        medical_history=medical_history,
    )
    account = User_Account(
        username=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256:600000"),
        role="patient",
        patient=patient,
        is_active=True,
    )
    db.session.add_all([patient, account])
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("An account with this email already exists.", 409, "duplicate_email")

    start_session(account)
    token = session.get(CSRF_SESSION_KEY)
    return (
        jsonify(
            {
                "message": "Your patient account is ready.",
                "user": serialize_user(account),
                "csrf_token": token,
            }
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    data = json_body()
    reject_forbidden_fields(data, {"role", "user_id", "patient_id", "doctor_id", "is_active"})
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        fields = {}
        if not email:
            fields["email"] = "Email is required."
        if not password:
            fields["password"] = "Password is required."
        raise ApiError("Please correct the highlighted fields.", 400, "validation_error", fields)
    account = User_Account.query.filter_by(username=email).first()
    if account is None or not check_password_hash(account.password_hash, password):
        raise ApiError("Email or password is incorrect.", 401, "invalid_credentials")
    if not account.is_active:
        raise ApiError("This account is inactive. Contact the hospital administrator.", 403, "inactive_account")

    start_session(account)
    token = session.get(CSRF_SESSION_KEY)
    return jsonify(
        {
            "message": "Signed in successfully.",
            "user": serialize_user(account),
            "csrf_token": token,
        }
    )


@auth_bp.post("/logout")
def logout():
    session.clear()
    token = ensure_csrf_token()
    return jsonify({"message": "Signed out successfully.", "csrf_token": token})


@auth_bp.get("/me")
def me():
    user = get_current_user()
    if user is None:
        raise ApiError("Please sign in to continue.", 401, "authentication_required")
    if not user.is_active:
        session.clear()
        ensure_csrf_token()
        raise ApiError("This account is inactive. Contact the hospital administrator.", 403, "inactive_account")
    return jsonify({"user": serialize_user(user), "csrf_token": ensure_csrf_token()})
