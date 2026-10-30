from concurrent.futures import ThreadPoolExecutor
from datetime import date, time

import pytest

from app.errors import ApiError
from app.extensions import db
from app.models import Appointment
from app.services.booking import book_appointment
from tests.conftest import login


def test_departments_include_active_doctor_counts(client, seeded):
    response = client.get("/api/departments")
    assert response.status_code == 200
    departments = response.get_json()["departments"]
    by_name = {item["department_name"]: item for item in departments}
    assert by_name["General Medicine"]["doctor_count"] == 1
    assert by_name["Cardiology"]["doctor_count"] == 1


def test_doctor_directory_search_and_detail(client, seeded):
    response = client.get("/api/doctors?search=Asha")
    assert response.status_code == 200
    doctors = response.get_json()["doctors"]
    assert len(doctors) == 1
    assert doctors[0]["name"] == "Dr. Asha Rao"

    detail = client.get(f"/api/doctors/{seeded['doctor_a_id']}")
    assert detail.status_code == 200
    payload = detail.get_json()
    assert payload["doctor"]["department_name"] == "General Medicine"
    assert len(payload["schedules"]) == 7

    missing = client.get("/api/doctors/99999")
    assert missing.status_code == 404


def test_availability_excludes_booked_slots(client, seeded):
    response = client.get(f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['future_date']}")
    assert response.status_code == 200
    payload = response.get_json()
    slot_times = {slot["start_time"] for slot in payload["slots"]}
    assert "10:00" in slot_times
    assert "09:30" not in slot_times


def test_availability_for_past_date_is_empty(client, seeded):
    response = client.get(f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['past_date']}")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["slots"] == []
    assert payload["message"] == "Choose today or a future date."

    missing_date = client.get(f"/api/doctors/{seeded['doctor_a_id']}/availability")
    assert missing_date.status_code == 400
    assert "date" in missing_date.get_json()["fields"]


def test_patient_can_book_an_available_slot(client, app, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.post(
        "/api/appointments",
        json={
            "doctor_id": seeded["doctor_a_id"],
            "appointment_date": seeded["future_date"],
            "appointment_time": "10:00",
            "reason_for_visit": "Persistent cough and mild fever.",
        },
    )
    assert response.status_code == 201
    appointment = response.get_json()["appointment"]
    assert appointment["status"] == "Booked"
    assert appointment["patient_id"] == seeded["patient_a_id"]

    with app.app_context():
        saved = db.session.get(Appointment, appointment["appointment_id"])
        assert saved is not None
        assert saved.status == "Booked"
        assert saved.reason_for_visit == "Persistent cough and mild fever."


def test_booking_rejects_a_reason_for_another_specialty(client, app, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.post(
        "/api/appointments",
        json={
            "doctor_id": seeded["doctor_b_id"],
            "appointment_date": seeded["future_date"],
            "appointment_time": "10:00",
            "reason_for_visit": "Acne and hair loss.",
        },
    )
    assert response.status_code == 422
    body = response.get_json()
    assert body["code"] == "reason_mismatch"
    assert "Dermatology" in body["fields"]["reason_for_visit"]
    with app.app_context():
        count = Appointment.query.filter_by(
            doctor_id=seeded["doctor_b_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(10, 0),
        ).count()
        assert count == 0


def test_booking_accepts_a_matching_specialty_reason(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.post(
        "/api/appointments",
        json={
            "doctor_id": seeded["doctor_b_id"],
            "appointment_date": seeded["future_date"],
            "appointment_time": "10:00",
            "reason_for_visit": "Chest pain and palpitations.",
        },
    )
    assert response.status_code == 201


def test_general_medicine_accepts_a_reason_from_another_specialty(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.post(
        "/api/appointments",
        json={
            "doctor_id": seeded["doctor_a_id"],
            "appointment_date": seeded["future_date"],
            "appointment_time": "10:00",
            "reason_for_visit": "Skin rash and hair loss.",
        },
    )
    assert response.status_code == 201


def test_reason_guidance_matches_whole_words():
    from app.services.reason_guidance import reason_mismatch

    assert reason_mismatch("Ear Nose and Throat", "Hearing loss for two weeks") is None
    assert reason_mismatch("Ear Nose and Throat", "Heart check") is not None
    assert reason_mismatch("General Medicine", "Acne") is None
    assert reason_mismatch("Cardiology", "High blood pressure review") is None


def test_duplicate_booking_is_rejected_without_a_second_row(client, app, seeded):
    login(client, "riya@example.com", "Patient@123")
    payload = {
        "doctor_id": seeded["doctor_a_id"],
        "appointment_date": seeded["future_date"],
        "appointment_time": "10:00",
        "reason_for_visit": "First request.",
    }
    first = client.post("/api/appointments", json=payload)
    assert first.status_code == 201

    payload["reason_for_visit"] = "Second request."
    second = client.post("/api/appointments", json=payload)
    assert second.status_code == 409
    assert second.get_json()["code"] == "slot_unavailable"

    with app.app_context():
        count = Appointment.query.filter_by(
            doctor_id=seeded["doctor_a_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(10, 0),
            status="Booked",
        ).count()
        assert count == 1


def test_booking_requires_login_and_an_available_slot(client, seeded):
    payload = {
        "doctor_id": seeded["doctor_a_id"],
        "appointment_date": seeded["future_date"],
        "appointment_time": "10:00",
        "reason_for_visit": "Persistent cough.",
    }
    assert client.post("/api/appointments", json=payload).status_code == 401

    login(client, "riya@example.com", "Patient@123")
    payload["appointment_time"] = "09:30"
    response = client.post("/api/appointments", json=payload)
    assert response.status_code == 409
    assert response.get_json()["code"] == "slot_unavailable"


def test_cancellation_releases_the_slot_and_writes_history(client, app, seeded):
    login(client, "riya@example.com", "Patient@123")
    appointment_id = seeded["cancelable_appointment_id"]

    before = client.get(f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['later_date']}")
    assert "10:00" not in {slot["start_time"] for slot in before.get_json()["slots"]}

    response = client.post(f"/api/appointments/{appointment_id}/cancel")
    assert response.status_code == 200
    appointment = response.get_json()["appointment"]
    assert appointment["status"] == "Cancelled"
    assert any(
        item["old_status"] == "Booked" and item["new_status"] == "Cancelled"
        for item in appointment["status_history"]
    )

    after = client.get(f"/api/doctors/{seeded['doctor_a_id']}/availability?date={seeded['later_date']}")
    assert "10:00" in {slot["start_time"] for slot in after.get_json()["slots"]}

    with app.app_context():
        saved = db.session.get(Appointment, appointment_id)
        assert saved.status == "Cancelled"


def test_cancellation_window_is_enforced(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.post(f"/api/appointments/{seeded['soon_appointment_id']}/cancel")
    assert response.status_code == 400
    assert response.get_json()["code"] == "cancellation_window_closed"


def test_stored_procedure_rejects_a_conflicting_booking(app, seeded):
    with app.app_context():
        with pytest.raises(ApiError) as error:
            book_appointment(
                seeded["patient_a_id"],
                seeded["doctor_a_id"],
                date.fromisoformat(seeded["future_date"]),
                time(9, 30),
                "Conflict through the procedure.",
            )
        assert error.value.code == "slot_conflict"
        count = Appointment.query.filter_by(
            doctor_id=seeded["doctor_a_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(9, 30),
        ).count()
        assert count == 1


def test_concurrent_bookings_create_only_one_appointment(app, seeded):
    def attempt_booking():
        with app.app_context():
            try:
                book_appointment(
                    seeded["patient_a_id"],
                    seeded["doctor_a_id"],
                    date.fromisoformat(seeded["future_date"]),
                    time(10, 0),
                    "Concurrent booking attempt.",
                )
                return "booked"
            except ApiError as error:
                return error.code
            except Exception as error:  # pragma: no cover - diagnostic for lock behaviour
                return type(error).__name__

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: attempt_booking(), range(2)))

    assert results.count("booked") == 1
    assert any(result in {"slot_conflict", "OperationalError"} for result in results)

    with app.app_context():
        count = Appointment.query.filter_by(
            doctor_id=seeded["doctor_a_id"],
            appointment_date=date.fromisoformat(seeded["future_date"]),
            appointment_time=time(10, 0),
            status="Booked",
        ).count()
        assert count == 1
