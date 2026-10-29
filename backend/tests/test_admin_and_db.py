from datetime import date, time

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import Appointment, Doctor, User_Account
from tests.conftest import login, logout


def test_admin_summary_uses_joins_and_aggregates(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.get("/api/admin/summary")
    assert response.status_code == 200
    payload = response.get_json()
    summary = payload["summary"]

    assert summary["patients"] == 2
    assert summary["doctors"] == 2
    assert summary["departments"] == 2
    assert summary["completed_appointments"] == 1
    assert summary["upcoming_appointments"] == 4
    assert summary["appointments_today"] == 1

    department_counts = {
        item["department_name"]: item["appointment_count"]
        for item in summary["appointments_by_department"]
    }
    assert set(department_counts) == {"General Medicine", "Cardiology"}
    assert sum(department_counts.values()) == 5


def test_admin_can_create_department_and_duplicate_is_rejected(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        "/api/admin/departments",
        json={
            "department_name": "Neurology",
            "description": "Outpatient assessment for headache, dizziness, and nerve concerns.",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["department"]["department_name"] == "Neurology"

    duplicate = client.post(
        "/api/admin/departments",
        json={"department_name": "neurology"},
    )
    assert duplicate.status_code == 409
    assert duplicate.get_json()["code"] == "duplicate_department"


def test_admin_can_create_doctor_with_hashed_password(client, app, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        "/api/admin/doctors",
        json={
            "name": "Dr. Kavya Menon",
            "specialization": "Neurology",
            "phone": "+91 90000 10003",
            "department_id": seeded["department_general_id"],
            "email": "kavya.menon@example.com",
            "password": "Doctor@456",
        },
    )
    assert response.status_code == 201
    doctor_payload = response.get_json()["doctor"]
    assert doctor_payload["email"] == "kavya.menon@example.com"

    with app.app_context():
        account = User_Account.query.filter_by(username="kavya.menon@example.com").one()
        assert account.password_hash != "Doctor@456"
        assert account.password_hash.startswith("pbkdf2:sha256")
        doctor = db.session.get(Doctor, doctor_payload["doctor_id"])
        assert doctor is not None
        assert doctor.department_id == seeded["department_general_id"]

    logout(client)
    login_response = login(client, "kavya.menon@example.com", "Doctor@456")
    assert login_response.status_code == 200
    assert login_response.get_json()["user"]["role"] == "doctor"


def test_schedule_overlap_is_rejected(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        "/api/admin/schedules",
        json={
            "doctor_id": seeded["doctor_a_id"],
            "day_of_week": 0,
            "start_time": "10:00",
            "end_time": "12:00",
            "slot_duration_minutes": 30,
        },
    )
    assert response.status_code == 409
    assert response.get_json()["code"] == "schedule_overlap"


def test_time_off_blocks_availability_and_overlap_is_rejected(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    payload = {
        "doctor_id": seeded["doctor_a_id"],
        "start_datetime": f"{seeded['future_date']}T10:00",
        "end_datetime": f"{seeded['future_date']}T11:00",
        "reason": "Department meeting.",
    }
    response = client.post("/api/admin/time-off", json=payload)
    assert response.status_code == 201
    time_off_id = response.get_json()["time_off"]["time_off_id"]

    duplicate = client.post("/api/admin/time-off", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["code"] == "time_off_overlap"

    availability = client.get(
        f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['future_date']}"
    )
    slots = {slot["start_time"] for slot in availability.get_json()["slots"]}
    assert "10:00" not in slots
    assert "10:30" not in slots
    assert "11:00" in slots

    removed = client.delete(f"/api/admin/time-off/{time_off_id}")
    assert removed.status_code == 200

    after = client.get(
        f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['future_date']}"
    )
    assert "10:00" in {slot["start_time"] for slot in after.get_json()["slots"]}


def test_admin_can_cancel_appointment_and_slot_is_released(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    appointment_id = seeded["booked_appointment_id"]

    response = client.post(f"/api/admin/appointments/{appointment_id}/cancel")
    assert response.status_code == 200
    appointment = response.get_json()["appointment"]
    assert appointment["status"] == "Cancelled"
    assert any(
        item["old_status"] == "Booked" and item["new_status"] == "Cancelled"
        for item in appointment["status_history"]
    )

    availability = client.get(
        f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['future_date']}"
    )
    assert "09:30" in {slot["start_time"] for slot in availability.get_json()["slots"]}


def test_admin_cannot_cancel_completed_appointment(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        f"/api/admin/appointments/{seeded['completed_appointment_id']}/cancel"
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "invalid_status"


def test_admin_appointment_search_and_filters(client, seeded):
    login(client, "admin@example.com", "Admin@123")

    search = client.get("/api/admin/appointments?search=Riya&per_page=20")
    assert search.status_code == 200
    search_payload = search.get_json()
    assert search_payload["pagination"]["total"] == 4
    assert {item["patient"]["name"] for item in search_payload["appointments"]} == {"Riya Kapoor"}

    completed = client.get("/api/admin/appointments?status=Completed")
    assert completed.status_code == 200
    assert completed.get_json()["pagination"]["total"] == 1

    by_department = client.get(
        f"/api/admin/appointments?department_id={seeded['department_general_id']}&per_page=20"
    )
    assert by_department.status_code == 200
    assert by_department.get_json()["pagination"]["total"] == 4

    by_date = client.get(f"/api/admin/appointments?date={seeded['future_date']}")
    assert by_date.status_code == 200
    assert by_date.get_json()["pagination"]["total"] == 1


def test_trigger_and_procedure_exist(app, seeded):
    with app.app_context():
        trigger = db.session.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.triggers "
                "WHERE trigger_schema = DATABASE() "
                "AND trigger_name = 'trg_appointment_status_audit'"
            )
        ).scalar()
        procedure = db.session.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.routines "
                "WHERE routine_schema = DATABASE() "
                "AND routine_name = 'sp_book_appointment'"
            )
        ).scalar()
    assert trigger == 1
    assert procedure == 1


def test_unique_active_slot_constraint_rejects_duplicate(app, seeded):
    with app.app_context():
        duplicate = Appointment(
            patient_id=seeded["patient_b_id"],
            doctor_id=seeded["doctor_a_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(9, 30),
            status="Confirmed",
            reason_for_visit="Duplicate active slot.",
        )
        db.session.add(duplicate)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_check_constraint_rejects_invalid_status(app, seeded):
    with app.app_context():
        invalid = Appointment(
            patient_id=seeded["patient_b_id"],
            doctor_id=seeded["doctor_a_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(11, 0),
            status="Unknown",
            reason_for_visit="Invalid status test.",
        )
        db.session.add(invalid)
        with pytest.raises(SQLAlchemyError):
            db.session.commit()
        db.session.rollback()
