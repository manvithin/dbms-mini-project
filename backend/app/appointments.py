import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import joinedload

from .auth import get_current_user, role_required
from .errors import ApiError
from .extensions import db
from .models import (
    ACTIVE_APPOINTMENT_STATUSES,
    APPOINTMENT_STATUSES,
    Appointment,
    Diagnosis,
    Doctor,
    Test_Order,
)
from .serializers import (
    serialize_appointment,
    serialize_appointment_detail,
    serialize_patient,
)
from .services.availability import (
    DOCTOR_STATUS_TRANSITIONS,
    admin_can_cancel,
    calculate_availability,
    hospital_now,
    patient_can_cancel,
)
from .services.booking import book_appointment
from .validation import (
    json_body,
    optional_text,
    pagination_args,
    pagination_payload,
    parse_date,
    parse_enum,
    parse_int,
    parse_time,
    required_text,
)

logger = logging.getLogger(__name__)

patient_bp = Blueprint("patient", __name__, url_prefix="/api/patients")
appointment_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")


def appointment_query():
    return Appointment.query.options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor).joinedload(Doctor.department),
        joinedload(Appointment.tests).joinedload(Test_Order.result),
        joinedload(Appointment.diagnosis).joinedload(Diagnosis.prescription),
        joinedload(Appointment.status_history),
    )


def load_appointment(appointment_id):
    return appointment_query().filter(Appointment.appointment_id == appointment_id).first()


def appointment_for_user(appointment_id, user):
    appointment = load_appointment(appointment_id)
    if appointment is None:
        raise ApiError("Appointment not found.", 404, "not_found")
    if user.role == "patient" and appointment.patient_id != user.patient_id:
        raise ApiError("Appointment not found.", 404, "not_found")
    if user.role == "doctor" and appointment.doctor_id != user.doctor_id:
        raise ApiError("Appointment not found.", 404, "not_found")
    return appointment


def appointment_permissions(appointment, user):
    permissions = {
        "can_cancel": False,
        "can_manage_clinical": False,
        "can_change_status": False,
        "allowed_statuses": [],
    }
    if user.role == "patient":
        permissions["can_cancel"] = patient_can_cancel(appointment)
    elif user.role == "doctor":
        permissions["can_manage_clinical"] = appointment.status in ("Checked In", "In Consultation", "Completed")
        permissions["can_change_status"] = True
        permissions["allowed_statuses"] = sorted(DOCTOR_STATUS_TRANSITIONS.get(appointment.status, set()))
        permissions["can_cancel"] = appointment.status in ("Booked", "Confirmed")
    elif user.role == "admin":
        permissions["can_cancel"] = admin_can_cancel(appointment)
    return permissions


@patient_bp.get("/me")
@role_required("patient")
def get_my_profile():
    user = get_current_user()
    if user.patient is None:
        raise ApiError("Patient profile not found.", 404, "not_found")
    return jsonify({"patient": serialize_patient(user.patient, include_account=True)})


@patient_bp.patch("/me")
@role_required("patient")
def update_my_profile():
    user = get_current_user()
    patient = user.patient
    if patient is None:
        raise ApiError("Patient profile not found.", 404, "not_found")

    data = json_body()
    if "name" in data:
        from .validation import validate_name

        patient.name = validate_name(data.get("name"))
    if "date_of_birth" in data:
        dob = parse_date(data.get("date_of_birth"), "date_of_birth", "Date of birth")
        if dob > hospital_now().date():
            raise ApiError(
                "Please correct the highlighted fields.",
                400,
                "validation_error",
                {"date_of_birth": "Date of birth cannot be in the future."},
            )
        patient.date_of_birth = dob
    if "gender" in data:
        from .models import GENDERS

        if data.get("gender") not in GENDERS:
            raise ApiError(
                "Please correct the highlighted fields.",
                400,
                "validation_error",
                {"gender": "Choose a valid gender option."},
            )
        patient.gender = data.get("gender")
    if "phone" in data:
        from .validation import validate_phone

        patient.phone = validate_phone(data.get("phone"))
    if "address" in data:
        patient.address = optional_text(data, "address", "Address", max_length=255)
    if "blood_group" in data:
        from .models import BLOOD_GROUPS

        if data.get("blood_group") not in BLOOD_GROUPS:
            raise ApiError(
                "Please correct the highlighted fields.",
                400,
                "validation_error",
                {"blood_group": "Choose a valid blood group."},
            )
        patient.blood_group = data.get("blood_group")
    if "medical_history" in data:
        patient.medical_history = optional_text(
            data, "medical_history", "Medical history", max_length=2000
        )

    db.session.commit()
    return jsonify({"message": "Profile updated.", "patient": serialize_patient(patient, include_account=True)})


@patient_bp.get("/me/appointments")
@role_required("patient")
def my_appointments():
    user = get_current_user()
    page, per_page = pagination_args(default_per_page=10)
    query = appointment_query().filter(Appointment.patient_id == user.patient_id)

    status = request.args.get("status")
    if status:
        if status not in APPOINTMENT_STATUSES:
            raise ApiError("Choose a valid appointment status.", 400, "invalid_filter")
        query = query.filter(Appointment.status == status)

    scope = request.args.get("scope", "all")
    today = hospital_now().date()
    if scope == "upcoming":
        query = query.filter(
            Appointment.appointment_date >= today,
            Appointment.status.in_(("Booked", "Confirmed", "Checked In", "In Consultation")),
        ).order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc())
    elif scope == "past":
        query = query.filter(
            or_(
                Appointment.appointment_date < today,
                Appointment.status.in_(("Completed", "Cancelled", "No Show")),
            )
        ).order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
    else:
        query = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())

    total = query.count()
    appointments = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(
        {
            "appointments": [serialize_appointment(item) for item in appointments],
            "pagination": pagination_payload(page, per_page, total),
        }
    )


@patient_bp.get("/me/records")
@role_required("patient")
def my_records():
    user = get_current_user()
    page, per_page = pagination_args(default_per_page=10)
    query = (
        appointment_query()
        .filter(Appointment.patient_id == user.patient_id)
        .filter(or_(Appointment.diagnosis.has(), Appointment.tests.any()))
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc())
    )
    total = query.count()
    records = query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify(
        {
            "records": [serialize_appointment_detail(item) for item in records],
            "pagination": pagination_payload(page, per_page, total),
        }
    )


@appointment_bp.post("")
@role_required("patient")
def create_appointment():
    user = get_current_user()
    data = json_body()
    doctor_id = parse_int(data.get("doctor_id"), "doctor_id", "Doctor")
    appointment_date = parse_date(data.get("appointment_date"), "appointment_date", "Appointment date")
    appointment_time = parse_time(data.get("appointment_time"), "appointment_time", "Appointment time")
    reason = required_text(data, "reason_for_visit", "Reason for visit", max_length=500)

    doctor = db.session.get(Doctor, doctor_id)
    if doctor is None:
        raise ApiError("Doctor not found.", 404, "not_found")
    if not doctor.is_active:
        raise ApiError("This doctor is not accepting appointments.", 400, "doctor_inactive")

    now = hospital_now()
    if appointment_date < now.date():
        raise ApiError("Choose today or a future appointment date.", 400, "past_date")

    slots = calculate_availability(doctor, appointment_date, now=now)
    if not any(slot["start_time"] == appointment_time.strftime("%H:%M") for slot in slots):
        raise ApiError(
            "This slot is no longer available. Please refresh availability and choose another time.",
            409,
            "slot_unavailable",
        )

    # End the read transaction so the procedure can own its locking transaction.
    db.session.rollback()
    try:
        appointment_id, message = book_appointment(
            user.patient_id, doctor_id, appointment_date, appointment_time, reason
        )
    except OperationalError as error:
        logger.warning("Booking procedure failed: %s", error)
        if getattr(error, "args", None) and error.args[0] in (1062, 1205, 1213):
            raise ApiError(
                "This slot is no longer available. Please refresh availability and choose another time.",
                409,
                "slot_conflict",
            )
        raise ApiError("The appointment could not be saved. Please try again.", 500, "booking_error")

    # The procedure committed on a separate database connection. Start a fresh
    # session so the new appointment is visible to the ORM.
    db.session.remove()
    appointment = load_appointment(appointment_id)
    if appointment is None:
        raise ApiError("The appointment was saved but could not be loaded. Please refresh.", 500, "load_error")
    return (
        jsonify(
            {
                "message": "Appointment booked successfully.",
                "appointment": serialize_appointment_detail(appointment),
            }
        ),
        201,
    )


@appointment_bp.get("/<int:appointment_id>")
@role_required("patient", "doctor", "admin")
def get_appointment(appointment_id):
    user = get_current_user()
    appointment = appointment_for_user(appointment_id, user)
    data = serialize_appointment_detail(appointment)
    data["permissions"] = appointment_permissions(appointment, user)
    return jsonify({"appointment": data})


@appointment_bp.post("/<int:appointment_id>/cancel")
@role_required("patient")
def cancel_appointment(appointment_id):
    user = get_current_user()
    appointment = appointment_for_user(appointment_id, user)
    if appointment.status not in ("Booked", "Confirmed"):
        raise ApiError("This appointment can no longer be cancelled.", 400, "invalid_status")
    if not patient_can_cancel(appointment):
        raise ApiError(
            "Appointments can be cancelled up to two hours before the start time.",
            400,
            "cancellation_window_closed",
        )
    appointment.status = "Cancelled"
    db.session.commit()
    db.session.expire_all()
    refreshed = load_appointment(appointment_id)
    return jsonify(
        {
            "message": "Appointment cancelled.",
            "appointment": serialize_appointment_detail(refreshed),
        }
    )
