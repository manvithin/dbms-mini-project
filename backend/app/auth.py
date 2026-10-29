from datetime import date
from functools import wraps

from flask import Blueprint, jsonify, request, session
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from .errors import ApiError
from .extensions import db
from .models import BLOOD_GROUPS, GENDERS, Patient, User_Account
from .serializers import serialize_user
from .services.availability import hospital_now
from .validation import (
    json_body,
    optional_text,
    parse_date,
    required_text,
    validate_email,
    validate_name,
    validate_password,
    validate_phone,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return db.session.get(User_Account, user_id)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if user is None:
            raise ApiError("Please sign in to continue.", 401, "authentication_required")
        if not user.is_active:
            session.clear()
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
    session.permanent = True


@auth_bp.post("/register")
def register():
    data = json_body()
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
    return jsonify({"message": "Your patient account is ready.", "user": serialize_user(account)}), 201


@auth_bp.post("/login")
def login():
    data = json_body()
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
    return jsonify({"message": "Signed in successfully.", "user": serialize_user(account)})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Signed out successfully."})


@auth_bp.get("/me")
def me():
    user = get_current_user()
    if user is None:
        raise ApiError("Please sign in to continue.", 401, "authentication_required")
    if not user.is_active:
        session.clear()
        raise ApiError("This account is inactive. Contact the hospital administrator.", 403, "inactive_account")
    return jsonify({"user": serialize_user(user)})
