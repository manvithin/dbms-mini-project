from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload
from werkzeug.security import generate_password_hash

from .auth import get_current_user, role_required
from .errors import ApiError
from .extensions import db
from .models import (
    APPOINTMENT_STATUSES,
    Appointment,
    Department,
    Doctor,
    Doctor_Schedule,
    Doctor_Time_Off,
    Patient,
    Test_Order,
    User_Account,
)
from .serializers import (
    serialize_appointment,
    serialize_appointment_detail,
    serialize_department,
    serialize_doctor,
    serialize_patient_mini,
    serialize_pending_test,
    serialize_schedule,
    serialize_time_off,
)
from .services.availability import (
    admin_can_cancel,
    hospital_now,
    schedule_overlaps,
    time_off_overlaps,
)
from .validation import (
    json_body,
    optional_text,
    pagination_args,
    pagination_payload,
    parse_bool,
    parse_date,
    parse_enum,
    parse_int,
    parse_local_datetime,
    parse_time,
    required_text,
    validate_email,
    validate_name,
    validate_password,
    validate_phone,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def department_with_count(department):
    count = Doctor.query.filter_by(department_id=department.department_id).count()
    return serialize_department(department, doctor_count=count)


def admin_appointment_query():
    from .appointments import appointment_query

    return appointment_query()


@admin_bp.get("/summary")
@role_required("admin")
def summary():
    today = hospital_now().date()
    status_rows = (
        db.session.query(Appointment.status, func.count(Appointment.appointment_id))
        .group_by(Appointment.status)
        .all()
    )
    status_counts = {status: count for status, count in status_rows}
    today_rows = (
        db.session.query(Appointment.status, func.count(Appointment.appointment_id))
        .filter(Appointment.appointment_date == today)
        .group_by(Appointment.status)
        .all()
    )
    today_counts = {status: count for status, count in today_rows}
    department_rows = (
        db.session.query(
            Department.department_id,
            Department.department_name,
            func.count(Appointment.appointment_id),
        )
        .outerjoin(Doctor, Doctor.department_id == Department.department_id)
        .outerjoin(Appointment, Appointment.doctor_id == Doctor.doctor_id)
        .group_by(Department.department_id, Department.department_name)
        .order_by(Department.department_name)
        .all()
    )
    upcoming = Appointment.query.filter(
        Appointment.appointment_date >= today,
        Appointment.status.in_(("Booked", "Confirmed", "Checked In", "In Consultation")),
    ).count()
    pending_tests = Test_Order.query.filter(Test_Order.status == "Ordered").count()
    recent = (
        admin_appointment_query()
        .order_by(Appointment.created_at.desc())
        .limit(8)
        .all()
    )
    today_appointments = (
        admin_appointment_query()
        .filter(Appointment.appointment_date == today)
        .order_by(Appointment.appointment_time)
        .limit(6)
        .all()
    )
    recent_completed = (
        admin_appointment_query()
        .filter(Appointment.status == "Completed")
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
        .limit(4)
        .all()
    )
    recent_cancelled = (
        admin_appointment_query()
        .filter(Appointment.status == "Cancelled")
        .order_by(Appointment.updated_at.desc())
        .limit(4)
        .all()
    )
    pending_test_orders = (
        Test_Order.query.options(
            joinedload(Test_Order.appointment).joinedload(Appointment.patient),
            joinedload(Test_Order.appointment)
            .joinedload(Appointment.doctor)
            .joinedload(Doctor.department),
        )
        .filter(Test_Order.status == "Ordered")
        .order_by(Test_Order.order_date.desc())
        .limit(4)
        .all()
    )
    recent_patients = Patient.query.order_by(Patient.patient_id.desc()).limit(4).all()
    active_doctor_preview = (
        Doctor.query.options(joinedload(Doctor.department))
        .filter(Doctor.is_active.is_(True))
        .order_by(Doctor.name)
        .limit(4)
        .all()
    )

    return jsonify(
        {
            "summary": {
                "patients": Patient.query.count(),
                "doctors": Doctor.query.filter(Doctor.is_active.is_(True)).count(),
                "departments": Department.query.count(),
                "appointments_today": sum(today_counts.values()),
                "upcoming_appointments": upcoming,
                "pending_tests": pending_tests,
                "cancelled_appointments": status_counts.get("Cancelled", 0),
                "completed_appointments": status_counts.get("Completed", 0),
                "today_status_counts": today_counts,
                "status_counts": status_counts,
                "appointments_by_department": [
                    {
                        "department_id": department_id,
                        "department_name": name,
                        "appointment_count": count,
                    }
                    for department_id, name, count in department_rows
                ],
                "today_appointments": [serialize_appointment(item) for item in today_appointments],
                "recent_completed_appointments": [
                    serialize_appointment(item) for item in recent_completed
                ],
                "recent_cancelled_appointments": [
                    serialize_appointment(item) for item in recent_cancelled
                ],
                "pending_test_orders": [
                    serialize_pending_test(item) for item in pending_test_orders
                ],
                "recent_patients": [serialize_patient_mini(item) for item in recent_patients],
                "active_doctor_preview": [
                    serialize_doctor(item) for item in active_doctor_preview
                ],
            },
            "recent_appointments": [serialize_appointment(item) for item in recent],
        }
    )


@admin_bp.get("/departments")
@role_required("admin")
def list_departments():
    departments = Department.query.order_by(Department.department_name).all()
    return jsonify({"departments": [department_with_count(item) for item in departments]})


@admin_bp.post("/departments")
@role_required("admin")
def create_department():
    data = json_body()
    name = required_text(data, "department_name", "Department name", min_length=2, max_length=100)
    description = optional_text(data, "description", "Description", max_length=2000)
    if Department.query.filter(func.lower(Department.department_name) == name.lower()).first():
        raise ApiError("A department with this name already exists.", 409, "duplicate_department")
    department = Department(department_name=name, description=description)
    db.session.add(department)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("A department with this name already exists.", 409, "duplicate_department")
    return (
        jsonify({"message": "Department created.", "department": serialize_department(department, doctor_count=0)}),
        201,
    )


@admin_bp.patch("/departments/<int:department_id>")
@role_required("admin")
def update_department(department_id):
    department = db.session.get(Department, department_id)
    if department is None:
        raise ApiError("Department not found.", 404, "not_found")
    data = json_body()
    if "department_name" in data:
        name = required_text(data, "department_name", "Department name", min_length=2, max_length=100)
        duplicate = Department.query.filter(
            func.lower(Department.department_name) == name.lower(),
            Department.department_id != department_id,
        ).first()
        if duplicate:
            raise ApiError("A department with this name already exists.", 409, "duplicate_department")
        department.department_name = name
    if "description" in data:
        department.description = optional_text(data, "description", "Description", max_length=2000)
    db.session.commit()
    return jsonify({"message": "Department updated.", "department": department_with_count(department)})


@admin_bp.get("/doctors")
@role_required("admin")
def list_doctors():
    page, per_page = pagination_args(default_per_page=12)
    query = Doctor.query.options(joinedload(Doctor.department), joinedload(Doctor.account)).join(Department)
    search = (request.args.get("search") or "").strip()
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Doctor.name.ilike(pattern), Doctor.specialization.ilike(pattern), Department.department_name.ilike(pattern))
        )
    department_id = request.args.get("department_id")
    if department_id:
        query = query.filter(Doctor.department_id == parse_int(department_id, "department_id", "Department"))
    query = query.order_by(Doctor.name)
    total = query.count()
    doctors = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(
        {
            "doctors": [serialize_doctor(item, include_account=True) for item in doctors],
            "pagination": pagination_payload(page, per_page, total),
        }
    )


@admin_bp.post("/doctors")
@role_required("admin")
def create_doctor():
    data = json_body()
    name = validate_name(data.get("name"))
    specialization = required_text(data, "specialization", "Specialization", min_length=2, max_length=120)
    phone = validate_phone(data.get("phone"))
    department_id = parse_int(data.get("department_id"), "department_id", "Department")
    email = validate_email(data.get("email"))
    password = validate_password(data.get("password"))

    department = db.session.get(Department, department_id)
    if department is None:
        raise ApiError("Department not found.", 404, "not_found")
    if User_Account.query.filter_by(username=email).first():
        raise ApiError("An account with this email already exists.", 409, "duplicate_email")

    doctor = Doctor(
        name=name,
        specialization=specialization,
        phone=phone,
        department_id=department_id,
        is_active=True,
    )
    account = User_Account(
        username=email,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256:600000"),
        role="doctor",
        doctor=doctor,
        is_active=True,
    )
    db.session.add_all([doctor, account])
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("An account with this email already exists.", 409, "duplicate_email")
    return (
        jsonify(
            {
                "message": "Doctor and doctor account created.",
                "doctor": serialize_doctor(doctor, include_account=True),
            }
        ),
        201,
    )


@admin_bp.patch("/doctors/<int:doctor_id>")
@role_required("admin")
def update_doctor(doctor_id):
    doctor = (
        Doctor.query.options(joinedload(Doctor.account), joinedload(Doctor.department))
        .filter(Doctor.doctor_id == doctor_id)
        .first()
    )
    if doctor is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    data = json_body()
    if "name" in data:
        doctor.name = validate_name(data.get("name"))
    if "specialization" in data:
        doctor.specialization = required_text(
            data, "specialization", "Specialization", min_length=2, max_length=120
        )
    if "phone" in data:
        doctor.phone = validate_phone(data.get("phone"))
    if "department_id" in data:
        department_id = parse_int(data.get("department_id"), "department_id", "Department")
        if db.session.get(Department, department_id) is None:
            raise ApiError("Department not found.", 404, "not_found")
        doctor.department_id = department_id
    if "is_active" in data:
        doctor.is_active = parse_bool(data.get("is_active"), "is_active", "Doctor active status")
    if "account_active" in data:
        if doctor.account is None:
            raise ApiError("This doctor has no login account.", 400, "missing_account")
        doctor.account.is_active = parse_bool(
            data.get("account_active"), "account_active", "Account active status"
        )
    db.session.commit()
    refreshed = (
        Doctor.query.options(joinedload(Doctor.account), joinedload(Doctor.department))
        .filter(Doctor.doctor_id == doctor_id)
        .first()
    )
    return jsonify(
        {"message": "Doctor updated.", "doctor": serialize_doctor(refreshed, include_account=True)}
    )


@admin_bp.post("/doctors/<int:doctor_id>/reset-password")
@role_required("admin")
def reset_doctor_password(doctor_id):
    doctor = db.session.get(Doctor, doctor_id)
    if doctor is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    if doctor.account is None:
        raise ApiError("This doctor has no login account.", 400, "missing_account")
    data = json_body()
    password = validate_password(data.get("new_password"))
    doctor.account.password_hash = generate_password_hash(password, method="pbkdf2:sha256:600000")
    db.session.commit()
    return jsonify({"message": "Doctor password reset successfully."})


@admin_bp.get("/schedules")
@role_required("admin")
def list_schedules():
    query = Doctor_Schedule.query.options(
        joinedload(Doctor_Schedule.doctor).joinedload(Doctor.department)
    )
    doctor_id = request.args.get("doctor_id")
    if doctor_id:
        query = query.filter(Doctor_Schedule.doctor_id == parse_int(doctor_id, "doctor_id", "Doctor"))
    day = request.args.get("day_of_week")
    if day:
        query = query.filter(
            Doctor_Schedule.day_of_week == parse_int(day, "day_of_week", "Day", minimum=0, maximum=6)
        )
    schedules = query.order_by(
        Doctor_Schedule.doctor_id, Doctor_Schedule.day_of_week, Doctor_Schedule.start_time
    ).all()
    return jsonify({"schedules": [serialize_schedule(item) for item in schedules]})


@admin_bp.post("/schedules")
@role_required("admin")
def create_schedule():
    data = json_body()
    doctor_id = parse_int(data.get("doctor_id"), "doctor_id", "Doctor")
    day = parse_int(data.get("day_of_week"), "day_of_week", "Day", minimum=0, maximum=6)
    start_time = parse_time(data.get("start_time"), "start_time", "Start time")
    end_time = parse_time(data.get("end_time"), "end_time", "End time")
    duration = parse_int(
        data.get("slot_duration_minutes", 30),
        "slot_duration_minutes",
        "Slot duration",
        minimum=5,
        maximum=240,
    )
    is_active = parse_bool(data.get("is_active", True), "is_active", "Schedule active status")
    if end_time <= start_time:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"end_time": "End time must be after start time."},
        )
    if db.session.get(Doctor, doctor_id) is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    if is_active and schedule_overlaps(doctor_id, day, start_time, end_time):
        raise ApiError("This schedule overlaps another active schedule for the doctor.", 409, "schedule_overlap")

    schedule = Doctor_Schedule(
        doctor_id=doctor_id,
        day_of_week=day,
        start_time=start_time,
        end_time=end_time,
        slot_duration_minutes=duration,
        is_active=is_active,
    )
    db.session.add(schedule)
    db.session.commit()
    refreshed = (
        Doctor_Schedule.query.options(joinedload(Doctor_Schedule.doctor).joinedload(Doctor.department))
        .filter(Doctor_Schedule.schedule_id == schedule.schedule_id)
        .first()
    )
    return jsonify({"message": "Schedule created.", "schedule": serialize_schedule(refreshed)}), 201


@admin_bp.patch("/schedules/<int:schedule_id>")
@role_required("admin")
def update_schedule(schedule_id):
    schedule = db.session.get(Doctor_Schedule, schedule_id)
    if schedule is None:
        raise ApiError("Schedule not found.", 404, "not_found")
    data = json_body()
    if "day_of_week" in data:
        schedule.day_of_week = parse_int(
            data.get("day_of_week"), "day_of_week", "Day", minimum=0, maximum=6
        )
    if "start_time" in data:
        schedule.start_time = parse_time(data.get("start_time"), "start_time", "Start time")
    if "end_time" in data:
        schedule.end_time = parse_time(data.get("end_time"), "end_time", "End time")
    if "slot_duration_minutes" in data:
        schedule.slot_duration_minutes = parse_int(
            data.get("slot_duration_minutes"),
            "slot_duration_minutes",
            "Slot duration",
            minimum=5,
            maximum=240,
        )
    if "is_active" in data:
        schedule.is_active = parse_bool(data.get("is_active"), "is_active", "Schedule active status")
    if schedule.end_time <= schedule.start_time:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"end_time": "End time must be after start time."},
        )
    if schedule.is_active and schedule_overlaps(
        schedule.doctor_id,
        schedule.day_of_week,
        schedule.start_time,
        schedule.end_time,
        exclude_schedule_id=schedule.schedule_id,
    ):
        raise ApiError("This schedule overlaps another active schedule for the doctor.", 409, "schedule_overlap")
    db.session.commit()
    refreshed = (
        Doctor_Schedule.query.options(joinedload(Doctor_Schedule.doctor).joinedload(Doctor.department))
        .filter(Doctor_Schedule.schedule_id == schedule_id)
        .first()
    )
    return jsonify({"message": "Schedule updated.", "schedule": serialize_schedule(refreshed)})


@admin_bp.delete("/schedules/<int:schedule_id>")
@role_required("admin")
def delete_schedule(schedule_id):
    schedule = db.session.get(Doctor_Schedule, schedule_id)
    if schedule is None:
        raise ApiError("Schedule not found.", 404, "not_found")
    db.session.delete(schedule)
    db.session.commit()
    return jsonify({"message": "Schedule deleted."})


@admin_bp.get("/time-off")
@role_required("admin")
def list_time_off():
    query = Doctor_Time_Off.query.options(joinedload(Doctor_Time_Off.doctor))
    doctor_id = request.args.get("doctor_id")
    if doctor_id:
        query = query.filter(Doctor_Time_Off.doctor_id == parse_int(doctor_id, "doctor_id", "Doctor"))
    entries = query.order_by(Doctor_Time_Off.start_datetime.desc()).all()
    return jsonify({"time_off": [serialize_time_off(item) for item in entries]})


@admin_bp.post("/time-off")
@role_required("admin")
def create_time_off():
    data = json_body()
    doctor_id = parse_int(data.get("doctor_id"), "doctor_id", "Doctor")
    start_datetime = parse_local_datetime(data.get("start_datetime"), "start_datetime", "Start time")
    end_datetime = parse_local_datetime(data.get("end_datetime"), "end_datetime", "End time")
    reason = optional_text(data, "reason", "Reason", max_length=255)
    if end_datetime <= start_datetime:
        raise ApiError(
            "Please correct the highlighted fields.",
            400,
            "validation_error",
            {"end_datetime": "End time must be after start time."},
        )
    if db.session.get(Doctor, doctor_id) is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    if time_off_overlaps(doctor_id, start_datetime, end_datetime):
        raise ApiError("This time off overlaps an existing time off entry.", 409, "time_off_overlap")
    entry = Doctor_Time_Off(
        doctor_id=doctor_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        reason=reason,
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify({"message": "Time off added.", "time_off": serialize_time_off(entry)}), 201


@admin_bp.delete("/time-off/<int:time_off_id>")
@role_required("admin")
def delete_time_off(time_off_id):
    entry = db.session.get(Doctor_Time_Off, time_off_id)
    if entry is None:
        raise ApiError("Time off entry not found.", 404, "not_found")
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Time off removed."})


@admin_bp.get("/appointments")
@role_required("admin")
def list_appointments():
    page, per_page = pagination_args(default_per_page=12)
    query = admin_appointment_query()

    status = request.args.get("status")
    if status:
        if status not in APPOINTMENT_STATUSES:
            raise ApiError("Choose a valid appointment status.", 400, "invalid_filter")
        query = query.filter(Appointment.status == status)

    raw_date = request.args.get("date")
    if raw_date:
        query = query.filter(Appointment.appointment_date == parse_date(raw_date, "date", "Date"))

    doctor_id = request.args.get("doctor_id")
    if doctor_id:
        query = query.filter(Appointment.doctor_id == parse_int(doctor_id, "doctor_id", "Doctor"))

    department_id = request.args.get("department_id")
    if department_id:
        dept = parse_int(department_id, "department_id", "Department")
        query = query.filter(Appointment.doctor.has(Doctor.department_id == dept))

    search = (request.args.get("search") or "").strip()
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Appointment.patient.has(Patient.name.ilike(pattern)),
                Appointment.doctor.has(Doctor.name.ilike(pattern)),
            )
        )

    scope = request.args.get("scope", "all")
    today = hospital_now().date()
    if scope == "today":
        query = query.filter(Appointment.appointment_date == today).order_by(
            Appointment.appointment_time
        )
    elif scope == "upcoming":
        query = query.filter(Appointment.appointment_date >= today).order_by(
            Appointment.appointment_date, Appointment.appointment_time
        )
    elif scope == "past":
        query = query.filter(Appointment.appointment_date < today).order_by(
            Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
        )
    else:
        query = query.order_by(
            Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
        )

    total = query.count()
    appointments = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(
        {
            "appointments": [serialize_appointment(item) for item in appointments],
            "pagination": pagination_payload(page, per_page, total),
        }
    )


@admin_bp.post("/appointments/<int:appointment_id>/cancel")
@role_required("admin")
def cancel_appointment(appointment_id):
    appointment = db.session.get(Appointment, appointment_id)
    if appointment is None:
        raise ApiError("Appointment not found.", 404, "not_found")
    if not admin_can_cancel(appointment):
        raise ApiError("This appointment can no longer be cancelled.", 400, "invalid_status")
    appointment.status = "Cancelled"
    db.session.commit()
    db.session.expire_all()
    refreshed = admin_appointment_query().filter(Appointment.appointment_id == appointment_id).first()
    return jsonify(
        {
            "message": "Appointment cancelled.",
            "appointment": serialize_appointment_detail(refreshed),
        }
    )
