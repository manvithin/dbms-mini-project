from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import joinedload

from .errors import ApiError
from .extensions import db
from .models import Department, Doctor, Doctor_Schedule
from .serializers import DAY_NAMES, serialize_department, serialize_doctor, serialize_schedule
from .services.availability import calculate_availability, hospital_now
from .validation import pagination_args, pagination_payload, parse_date, parse_int

public_bp = Blueprint("public", __name__, url_prefix="/api")


@public_bp.get("/departments")
def list_departments():
    rows = (
        db.session.query(Department, func.count(Doctor.doctor_id).label("doctor_count"))
        .outerjoin(
            Doctor,
            and_(Doctor.department_id == Department.department_id, Doctor.is_active.is_(True)),
        )
        .group_by(Department.department_id, Department.department_name, Department.description)
        .order_by(Department.department_name)
        .all()
    )
    return jsonify(
        {
            "departments": [
                serialize_department(department, doctor_count=count) for department, count in rows
            ]
        }
    )


@public_bp.get("/doctors")
def list_doctors():
    page, per_page = pagination_args(default_per_page=12)
    query = Doctor.query.options(joinedload(Doctor.department)).join(Department).filter(Doctor.is_active.is_(True))

    department_id = request.args.get("department_id")
    if department_id:
        query = query.filter(Doctor.department_id == parse_int(department_id, "department_id", "Department"))
    search = (request.args.get("search") or "").strip()
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Doctor.name.ilike(pattern),
                Doctor.specialization.ilike(pattern),
                Department.department_name.ilike(pattern),
            )
        )

    query = query.order_by(Doctor.name)
    total = query.count()
    doctors = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(
        {
            "doctors": [serialize_doctor(doctor) for doctor in doctors],
            "pagination": pagination_payload(page, per_page, total),
        }
    )


@public_bp.get("/doctors/<int:doctor_id>")
def get_doctor(doctor_id):
    doctor = (
        Doctor.query.options(joinedload(Doctor.department))
        .filter(Doctor.doctor_id == doctor_id, Doctor.is_active.is_(True))
        .first()
    )
    if doctor is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    schedules = (
        Doctor_Schedule.query.filter_by(doctor_id=doctor_id, is_active=True)
        .order_by(Doctor_Schedule.day_of_week, Doctor_Schedule.start_time)
        .all()
    )
    return jsonify(
        {
            "doctor": serialize_doctor(doctor),
            "schedules": [serialize_schedule(schedule) for schedule in schedules],
        }
    )


@public_bp.get("/doctors/<int:doctor_id>/availability")
def doctor_availability(doctor_id):
    doctor = (
        Doctor.query.options(joinedload(Doctor.department))
        .filter(Doctor.doctor_id == doctor_id, Doctor.is_active.is_(True))
        .first()
    )
    if doctor is None:
        raise ApiError("Doctor not found or not accepting appointments.", 404, "not_found")

    raw_date = request.args.get("date")
    if not raw_date:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"date": "Choose a date."},
        )
    target_date = parse_date(raw_date, "date", "Date")
    now = hospital_now()
    if target_date < now.date():
        return jsonify(
            {
                "doctor_id": doctor_id,
                "date": target_date.isoformat(),
                "day_name": DAY_NAMES[target_date.weekday()],
                "slots": [],
                "has_schedule": False,
                "message": "Choose today or a future date.",
            }
        )

    slots = calculate_availability(doctor, target_date, now=now)
    schedules = Doctor_Schedule.query.filter_by(
        doctor_id=doctor_id,
        day_of_week=target_date.weekday(),
        is_active=True,
    ).all()
    message = None
    if not schedules:
        message = "This doctor has no clinic hours on this day."
    elif not slots:
        message = "No slots remain for this date. Try another day."

    return jsonify(
        {
            "doctor_id": doctor_id,
            "date": target_date.isoformat(),
            "day_name": DAY_NAMES[target_date.weekday()],
            "slots": slots,
            "has_schedule": bool(schedules),
            "message": message,
        }
    )
