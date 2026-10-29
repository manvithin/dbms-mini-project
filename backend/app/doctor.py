from datetime import date

from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from .auth import get_current_user, role_required
from .errors import ApiError
from .extensions import db
from .models import (
    APPOINTMENT_STATUSES,
    Appointment,
    Diagnosis,
    Doctor,
    Prescription,
    Test_Order,
)
from .serializers import (
    serialize_appointment,
    serialize_appointment_detail,
    serialize_diagnosis,
    serialize_prescription,
    serialize_test_order,
)
from .services.availability import (
    DOCTOR_STATUS_TRANSITIONS,
    can_write_clinical_records,
    doctor_can_change_status,
    hospital_now,
)
from .validation import (
    json_body,
    optional_text,
    pagination_args,
    pagination_payload,
    parse_date,
    parse_enum,
    parse_int,
    required_text,
)

doctor_bp = Blueprint("doctor", __name__, url_prefix="/api/doctor")
clinical_bp = Blueprint("clinical", __name__, url_prefix="/api")


def doctor_appointment_query():
    from .appointments import appointment_query

    return appointment_query()


def get_doctor_appointment(appointment_id, user):
    appointment = (
        doctor_appointment_query()
        .filter(
            Appointment.appointment_id == appointment_id,
            Appointment.doctor_id == user.doctor_id,
        )
        .first()
    )
    if appointment is None:
        raise ApiError("Appointment not found.", 404, "not_found")
    return appointment


def get_doctor_test(test_id, user):
    test = (
        Test_Order.query.options(
            joinedload(Test_Order.result),
            joinedload(Test_Order.appointment).joinedload(Appointment.doctor),
        )
        .filter(Test_Order.test_id == test_id)
        .first()
    )
    if test is None or test.appointment.doctor_id != user.doctor_id:
        raise ApiError("Test order not found.", 404, "not_found")
    return test


def get_doctor_diagnosis(diagnosis_id, user):
    diagnosis = (
        Diagnosis.query.options(
            joinedload(Diagnosis.prescription),
            joinedload(Diagnosis.appointment).joinedload(Appointment.doctor),
        )
        .filter(Diagnosis.diagnosis_id == diagnosis_id)
        .first()
    )
    if diagnosis is None or diagnosis.appointment.doctor_id != user.doctor_id:
        raise ApiError("Diagnosis not found.", 404, "not_found")
    return diagnosis


@doctor_bp.get("/summary")
@role_required("doctor")
def summary():
    user = get_current_user()
    if user.doctor is None:
        raise ApiError("Doctor profile not found.", 404, "not_found")
    today = hospital_now().date()
    base = Appointment.query.filter(Appointment.doctor_id == user.doctor_id)

    today_rows = (
        db.session.query(Appointment.status, func.count(Appointment.appointment_id))
        .filter(Appointment.doctor_id == user.doctor_id, Appointment.appointment_date == today)
        .group_by(Appointment.status)
        .all()
    )
    status_counts = {status: count for status, count in today_rows}

    upcoming_query = (
        doctor_appointment_query()
        .filter(
            Appointment.doctor_id == user.doctor_id,
            Appointment.appointment_date >= today,
            Appointment.status.in_(("Booked", "Confirmed", "Checked In", "In Consultation")),
        )
        .order_by(Appointment.appointment_date, Appointment.appointment_time)
    )
    upcoming = upcoming_query.limit(5).all()
    pending_tests = (
        Test_Order.query.join(Appointment)
        .filter(Appointment.doctor_id == user.doctor_id, Test_Order.status == "Ordered")
        .count()
    )
    distinct_patients = (
        db.session.query(func.count(func.distinct(Appointment.patient_id)))
        .filter(Appointment.doctor_id == user.doctor_id)
        .scalar()
    )

    return jsonify(
        {
            "summary": {
                "today_total": sum(status_counts.values()),
                "today_waiting": status_counts.get("Booked", 0)
                + status_counts.get("Confirmed", 0)
                + status_counts.get("Checked In", 0),
                "today_in_consultation": status_counts.get("In Consultation", 0),
                "today_completed": status_counts.get("Completed", 0),
                "today_status_counts": status_counts,
                "upcoming_total": upcoming_query.count(),
                "pending_tests": pending_tests,
                "distinct_patients": distinct_patients or 0,
            },
            "upcoming_appointments": [serialize_appointment(item) for item in upcoming],
        }
    )


@doctor_bp.get("/appointments")
@role_required("doctor")
def list_appointments():
    user = get_current_user()
    page, per_page = pagination_args(default_per_page=10)
    query = doctor_appointment_query().filter(Appointment.doctor_id == user.doctor_id)

    status = request.args.get("status")
    if status:
        if status not in APPOINTMENT_STATUSES:
            raise ApiError("Choose a valid appointment status.", 400, "invalid_filter")
        query = query.filter(Appointment.status == status)

    raw_date = request.args.get("date")
    if raw_date:
        query = query.filter(Appointment.appointment_date == parse_date(raw_date, "date", "Date"))

    scope = request.args.get("scope", "all")
    today = hospital_now().date()
    if scope == "today":
        query = query.filter(Appointment.appointment_date == today).order_by(Appointment.appointment_time)
    elif scope == "upcoming":
        query = query.filter(Appointment.appointment_date >= today).order_by(
            Appointment.appointment_date, Appointment.appointment_time
        )
    elif scope == "past":
        query = query.filter(Appointment.appointment_date < today).order_by(
            Appointment.appointment_date.desc(), Appointment.appointment_time.desc()
        )
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


@doctor_bp.get("/appointments/<int:appointment_id>")
@role_required("doctor")
def get_appointment(appointment_id):
    user = get_current_user()
    appointment = get_doctor_appointment(appointment_id, user)
    data = serialize_appointment_detail(appointment)
    data["permissions"] = {
        "can_manage_clinical": can_write_clinical_records(appointment),
        "allowed_statuses": sorted(DOCTOR_STATUS_TRANSITIONS.get(appointment.status, set())),
        "can_change_status": True,
    }
    return jsonify({"appointment": data})


@doctor_bp.patch("/appointments/<int:appointment_id>/status")
@role_required("doctor")
def update_status(appointment_id):
    user = get_current_user()
    appointment = get_doctor_appointment(appointment_id, user)
    data = json_body()
    new_status = parse_enum(data.get("status"), APPOINTMENT_STATUSES, "status", "appointment status")
    if not doctor_can_change_status(appointment.status, new_status):
        raise ApiError(
            f"The appointment cannot move from {appointment.status} to {new_status}.",
            400,
            "invalid_status_transition",
        )
    appointment.status = new_status
    db.session.commit()
    db.session.expire_all()
    refreshed = get_doctor_appointment(appointment_id, user)
    return jsonify(
        {
            "message": f"Appointment status updated to {new_status}.",
            "appointment": serialize_appointment_detail(refreshed),
        }
    )


@clinical_bp.post("/appointments/<int:appointment_id>/tests")
@role_required("doctor")
def create_test_order(appointment_id):
    user = get_current_user()
    appointment = get_doctor_appointment(appointment_id, user)
    if not can_write_clinical_records(appointment):
        raise ApiError(
            "Clinical records can be added after the patient is checked in.",
            400,
            "invalid_appointment_status",
        )
    data = json_body()
    test_type = required_text(data, "test_type", "Test type", max_length=120)
    notes = optional_text(data, "notes", "Notes", max_length=1000)

    test = Test_Order(
        appointment_id=appointment.appointment_id,
        test_type=test_type,
        status="Ordered",
        notes=notes,
    )
    db.session.add(test)
    db.session.commit()
    return jsonify({"message": "Test ordered.", "test": serialize_test_order(test)}), 201


@clinical_bp.post("/tests/<int:test_id>/result")
@role_required("doctor")
def record_test_result(test_id):
    user = get_current_user()
    test = get_doctor_test(test_id, user)
    if test.appointment.status in ("Cancelled", "No Show"):
        raise ApiError("A result cannot be added to a cancelled appointment.", 400, "invalid_appointment_status")
    if test.status == "Cancelled":
        raise ApiError("This test order was cancelled.", 400, "test_cancelled")
    if test.result is not None:
        raise ApiError("A result already exists for this test order.", 409, "duplicate_result")

    data = json_body()
    result_summary = required_text(data, "result_summary", "Result summary", max_length=2000)
    remarks = optional_text(data, "remarks", "Remarks", max_length=1000)

    from .models import Test_Result

    result = Test_Result(
        test_id=test.test_id,
        result_summary=result_summary,
        remarks=remarks,
    )
    test.status = "Completed"
    db.session.add(result)
    db.session.commit()
    refreshed = get_doctor_test(test_id, user)
    return (
        jsonify({"message": "Test result recorded.", "test": serialize_test_order(refreshed)}),
        201,
    )


@clinical_bp.post("/appointments/<int:appointment_id>/diagnosis")
@role_required("doctor")
def record_diagnosis(appointment_id):
    user = get_current_user()
    appointment = get_doctor_appointment(appointment_id, user)
    if not can_write_clinical_records(appointment):
        raise ApiError(
            "A diagnosis can be recorded after the patient is checked in.",
            400,
            "invalid_appointment_status",
        )
    if appointment.diagnosis is not None:
        raise ApiError("A diagnosis already exists for this appointment.", 409, "duplicate_diagnosis")

    data = json_body()
    description = required_text(
        data, "diagnosis_description", "Diagnosis description", max_length=2000
    )
    notes = optional_text(data, "notes", "Notes", max_length=2000)

    diagnosis = Diagnosis(
        appointment_id=appointment.appointment_id,
        diagnosis_description=description,
        notes=notes,
    )
    db.session.add(diagnosis)
    db.session.commit()
    return (
        jsonify({"message": "Diagnosis recorded.", "diagnosis": serialize_diagnosis(diagnosis)}),
        201,
    )


@clinical_bp.post("/diagnoses/<int:diagnosis_id>/prescription")
@role_required("doctor")
def record_prescription(diagnosis_id):
    user = get_current_user()
    diagnosis = get_doctor_diagnosis(diagnosis_id, user)
    if not can_write_clinical_records(diagnosis.appointment):
        raise ApiError(
            "A prescription can be recorded after the patient is checked in.",
            400,
            "invalid_appointment_status",
        )
    if diagnosis.prescription is not None:
        raise ApiError("A prescription already exists for this diagnosis.", 409, "duplicate_prescription")

    data = json_body()
    treatment_plan = required_text(data, "treatment_plan", "Treatment plan", max_length=2000)
    instructions = required_text(data, "instructions", "Instructions", max_length=2000)
    follow_up_date = None
    if data.get("follow_up_date"):
        follow_up_date = parse_date(data.get("follow_up_date"), "follow_up_date", "Follow up date")
        if follow_up_date < hospital_now().date():
            raise ApiError(
                "Please correct the highlighted fields.",
                400,
                "validation_error",
                {"follow_up_date": "Follow up date cannot be in the past."},
            )

    prescription = Prescription(
        diagnosis_id=diagnosis.diagnosis_id,
        treatment_plan=treatment_plan,
        instructions=instructions,
        follow_up_date=follow_up_date,
    )
    db.session.add(prescription)
    db.session.commit()
    return (
        jsonify(
            {
                "message": "Prescription and treatment plan recorded.",
                "prescription": serialize_prescription(prescription),
            }
        ),
        201,
    )
