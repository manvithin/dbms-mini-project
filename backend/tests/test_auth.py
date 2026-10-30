from app.extensions import db
from app.models import Patient, User_Account
from tests.conftest import login, logout


def test_registration_hashes_password_and_starts_session(client, app, seeded):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Nisha Verma",
            "email": "nisha.verma@example.com",
            "password": "Patient@456",
            "date_of_birth": "1995-08-21",
            "gender": "Female",
            "phone": "+91 90000 30001",
            "address": "7 Garden Lane, Bengaluru",
            "blood_group": "A positive",
            "medical_history": "No known allergies.",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["user"]["role"] == "patient"
    assert payload["user"]["name"] == "Nisha Verma"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["email"] == "nisha.verma@example.com"

    with app.app_context():
        account = User_Account.query.filter_by(username="nisha.verma@example.com").one()
        assert account.password_hash != "Patient@456"
        assert account.password_hash.startswith("pbkdf2:sha256")
        patient = Patient.query.filter_by(name="Nisha Verma").one()
        assert patient.blood_group == "A positive"


def test_duplicate_registration_is_rejected(client, seeded):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Another Riya",
            "email": "riya@example.com",
            "password": "Patient@456",
            "date_of_birth": "1994-02-10",
            "gender": "Female",
            "phone": "+91 90000 30002",
        },
    )
    assert response.status_code == 409
    assert response.get_json()["code"] == "duplicate_email"


def test_login_and_logout_flow(client, seeded):
    response = login(client, "riya@example.com", "Patient@123")
    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "patient"

    me = client.get("/api/auth/me")
    assert me.status_code == 200

    response = logout(client)
    assert response.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_login_rejects_wrong_password(client, seeded):
    response = login(client, "riya@example.com", "WrongPassword1")
    assert response.status_code == 401
    assert response.get_json()["code"] == "invalid_credentials"


def test_inactive_account_cannot_login(client, app, seeded):
    with app.app_context():
        account = User_Account.query.filter_by(username="riya@example.com").one()
        account.is_active = False
        db.session.commit()

    response = login(client, "riya@example.com", "Patient@123")
    assert response.status_code == 403
    assert response.get_json()["code"] == "inactive_account"


def test_registration_validation_returns_field_errors(client, seeded):
    base_payload = {
        "name": "Nisha Verma",
        "email": "nisha.verma@example.com",
        "password": "Patient@456",
        "date_of_birth": "1995-08-21",
        "gender": "Female",
        "phone": "+91 90000 30001",
    }
    cases = [
        ({"name": "A"}, "name"),
        ({"email": "not-an-email"}, "email"),
        ({"password": "short"}, "password"),
        ({"phone": "12"}, "phone"),
        ({"gender": "Unknown"}, "gender"),
    ]
    for change, expected_field in cases:
        payload = {**base_payload, **change}
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 400
        fields = response.get_json()["fields"]
        assert expected_field in fields


def test_unauthenticated_requests_are_rejected(client, seeded):
    assert client.get("/api/patients/me").status_code == 401
    assert client.get("/api/admin/summary").status_code == 401
    assert client.get("/api/doctor/summary").status_code == 401


def test_patient_cannot_use_admin_or_read_another_patient_record(client, seeded):
    login(client, "riya@example.com", "Patient@123")

    assert client.get("/api/admin/summary").status_code == 403
    assert client.post("/api/admin/departments", json={"department_name": "Neurology"}).status_code == 403
    assert client.get(f"/api/appointments/{seeded['other_patient_appointment_id']}").status_code == 404
    assert client.get(f"/api/doctor/appointments/{seeded['booked_appointment_id']}").status_code == 403


def test_doctor_cannot_read_another_doctors_appointment(client, seeded):
    login(client, "vikram.shah@example.com", "Doctor@123")
    response = client.get(f"/api/doctor/appointments/{seeded['booked_appointment_id']}")
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"
