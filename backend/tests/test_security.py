from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import System_Setting, User_Account
from tests.conftest import TEST_SETUP_SECRET, login, logout


def test_unauthenticated_doctor_update_is_rejected(client, seeded):
    response = client.patch(
        f"/api/admin/doctors/{seeded['doctor_a_id']}",
        json={"phone": "+91 90000 19999"},
    )
    assert response.status_code == 401
    assert response.get_json()["code"] == "authentication_required"


def test_patient_cannot_update_a_doctor(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.patch(
        f"/api/admin/doctors/{seeded['doctor_a_id']}",
        json={"phone": "+91 90000 19999"},
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "forbidden"


def test_doctor_cannot_update_another_doctor(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    response = client.patch(
        f"/api/admin/doctors/{seeded['doctor_b_id']}",
        json={"phone": "+91 90000 19999"},
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "forbidden"


def test_doctor_cannot_use_an_admin_endpoint(client, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    assert client.get("/api/admin/summary").status_code == 403
    assert client.get("/api/admin/security").status_code == 403


def test_patient_cannot_use_an_admin_endpoint(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    assert client.get("/api/admin/summary").status_code == 403
    assert client.get("/api/admin/security").status_code == 403


def test_administrator_can_update_a_doctor(client, app, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.patch(
        f"/api/admin/doctors/{seeded['doctor_a_id']}",
        json={"phone": "+91 90000 18888"},
    )
    assert response.status_code == 200
    assert response.get_json()["doctor"]["phone"] == "+91 90000 18888"

    with app.app_context():
        account = User_Account.query.filter_by(username="admin@example.com").one()
        assert account.role == "admin"


def test_invalid_administrator_credentials_are_rejected(client, seeded):
    response = login(client, "admin@example.com", "NotThePassword1")
    assert response.status_code == 401
    assert response.get_json()["code"] == "invalid_credentials"


def test_invalid_setup_secret_is_rejected(client, seeded_no_admin):
    response = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "first.admin@example.com",
            "password": "FirstAdmin123",
            "confirm_password": "FirstAdmin123",
            "setup_secret": "wrong-setup-secret",
        },
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "invalid_setup_secret"


def test_setup_is_rejected_after_an_administrator_exists(client, seeded):
    response = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "second.admin@example.com",
            "password": "SecondAdmin123",
            "confirm_password": "SecondAdmin123",
            "setup_secret": TEST_SETUP_SECRET,
        },
    )
    assert response.status_code == 409
    assert response.get_json()["code"] == "setup_completed"


def test_first_time_setup_creates_one_administrator_and_closes_setup(
    client, app, seeded_no_admin
):
    status = client.get("/api/auth/setup-status")
    assert status.status_code == 200
    assert status.get_json()["setup_required"] is True

    response = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "first.admin@example.com",
            "password": "FirstAdmin123",
            "confirm_password": "FirstAdmin123",
            "setup_secret": TEST_SETUP_SECRET,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["user"]["role"] == "admin"

    with app.app_context():
        account = User_Account.query.filter_by(username="first.admin@example.com").one()
        assert account.role == "admin"
        assert account.password_hash != "FirstAdmin123"
        assert check_password_hash(account.password_hash, "FirstAdmin123")
        assert db.session.get(System_Setting, "admin_setup_completed") is not None

    after = client.get("/api/auth/setup-status")
    assert after.get_json()["setup_required"] is False

    second = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "another.admin@example.com",
            "password": "AnotherAdmin123",
            "confirm_password": "AnotherAdmin123",
            "setup_secret": TEST_SETUP_SECRET,
        },
    )
    assert second.status_code == 409


def test_setup_marker_stays_closed_after_administrator_is_removed(
    client, app, seeded_no_admin
):
    setup = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "first.admin@example.com",
            "password": "FirstAdmin123",
            "confirm_password": "FirstAdmin123",
            "setup_secret": TEST_SETUP_SECRET,
        },
    )
    assert setup.status_code == 201

    with app.app_context():
        User_Account.query.filter_by(role="admin").delete()
        db.session.commit()

    status = client.get("/api/auth/setup-status")
    assert status.get_json()["setup_required"] is False

    retry = client.post(
        "/api/auth/setup-admin",
        json={
            "email": "replacement.admin@example.com",
            "password": "Replacement123",
            "confirm_password": "Replacement123",
            "setup_secret": TEST_SETUP_SECRET,
        },
    )
    assert retry.status_code == 409


def test_administrator_password_change_requires_current_password(client, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        "/api/admin/security/password",
        json={
            "current_password": "WrongPassword1",
            "new_password": "NewAdmin123",
            "confirm_password": "NewAdmin123",
        },
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "invalid_current_password"


def test_administrator_password_change_invalidates_the_session(client, app, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.post(
        "/api/admin/security/password",
        json={
            "current_password": "Admin@123",
            "new_password": "NewAdmin123",
            "confirm_password": "NewAdmin123",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["reauthentication_required"] is True

    assert client.get("/api/auth/me").status_code == 401

    old_login = login(client, "admin@example.com", "Admin@123")
    assert old_login.status_code == 401
    assert old_login.get_json()["code"] == "invalid_credentials"

    new_login = login(client, "admin@example.com", "NewAdmin123")
    assert new_login.status_code == 200

    with app.app_context():
        account = User_Account.query.filter_by(username="admin@example.com").one()
        assert check_password_hash(account.password_hash, "NewAdmin123")
        assert not check_password_hash(account.password_hash, "Admin@123")


def test_administrator_can_change_the_sign_in_email(client, app, seeded):
    login(client, "admin@example.com", "Admin@123")
    response = client.patch(
        "/api/admin/security/email",
        json={
            "email": "lead.admin@example.com",
            "current_password": "Admin@123",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "lead.admin@example.com"

    logout(client)
    assert login(client, "admin@example.com", "Admin@123").status_code == 401
    assert login(client, "lead.admin@example.com", "Admin@123").status_code == 200


def test_role_changes_are_rejected_in_request_payloads(client, app, seeded):
    login(client, "riya@example.com", "Patient@123")
    response = client.patch("/api/patients/me", json={"role": "admin"})
    assert response.status_code == 400
    assert response.get_json()["code"] == "forbidden_field"

    response = client.patch("/api/patients/me", json={"doctor_id": seeded["doctor_a_id"]})
    assert response.status_code == 400
    assert response.get_json()["code"] == "forbidden_field"

    with app.app_context():
        account = User_Account.query.filter_by(username="riya@example.com").one()
        assert account.role == "patient"
        assert account.doctor_id is None

    login(client, "admin@example.com", "Admin@123")
    response = client.patch(
        f"/api/admin/doctors/{seeded['doctor_a_id']}",
        json={"role": "admin"},
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "forbidden_field"


def test_doctor_can_view_and_update_only_own_contact_details(client, app, seeded):
    login(client, "asha.rao@example.com", "Doctor@123")
    profile = client.get("/api/doctor/profile")
    assert profile.status_code == 200
    assert profile.get_json()["doctor"]["doctor_id"] == seeded["doctor_a_id"]
    assert profile.get_json()["doctor"]["email"] == "asha.rao@example.com"

    update = client.patch("/api/doctor/profile", json={"phone": "+91 90000 17777"})
    assert update.status_code == 200
    assert update.get_json()["doctor"]["phone"] == "+91 90000 17777"

    for payload in (
        {"name": "Dr. Changed Name"},
        {"specialization": "Cardiology"},
        {"department_id": seeded["department_cardiology_id"]},
        {"role": "admin"},
        {"email": "changed@example.com"},
    ):
        response = client.patch("/api/doctor/profile", json=payload)
        assert response.status_code == 400
        assert response.get_json()["code"] == "forbidden_field"

    with app.app_context():
        from app.models import Doctor

        doctor = db.session.get(Doctor, seeded["doctor_a_id"])
        assert doctor.name == "Dr. Asha Rao"
        assert doctor.department_id == seeded["department_general_id"]


def test_patient_cannot_open_a_doctor_profile(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    assert client.get("/api/doctor/profile").status_code == 403
    assert client.patch("/api/doctor/profile", json={"phone": "+91 90000 16666"}).status_code == 403


def test_csrf_is_required_for_state_changing_requests(raw_client, seeded):
    missing = raw_client.post(
        "/api/auth/login",
        json={"email": "riya@example.com", "password": "Patient@123"},
    )
    assert missing.status_code == 403
    assert missing.get_json()["code"] == "csrf_failed"

    token_response = raw_client.get("/api/auth/csrf")
    assert token_response.status_code == 200
    token = token_response.get_json()["csrf_token"]

    wrong = raw_client.post(
        "/api/auth/login",
        json={"email": "riya@example.com", "password": "Patient@123"},
        headers={"X-CSRF-Token": "not-the-token"},
    )
    assert wrong.status_code == 403

    accepted = raw_client.post(
        "/api/auth/login",
        json={"email": "riya@example.com", "password": "Patient@123"},
        headers={"X-CSRF-Token": token},
    )
    assert accepted.status_code == 200


def test_session_cookie_is_http_only_and_same_site(client, seeded):
    response = login(client, "riya@example.com", "Patient@123")
    cookies = response.headers.getlist("Set-Cookie")
    assert cookies
    session_cookie = next(cookie for cookie in cookies if cookie.startswith("hospital_session="))
    assert "HttpOnly" in session_cookie
    assert "SameSite=Lax" in session_cookie


def test_logout_invalidates_the_session(client, seeded):
    login(client, "riya@example.com", "Patient@123")
    assert client.get("/api/auth/me").status_code == 200
    logout(client)
    assert client.get("/api/auth/me").status_code == 401


def test_setup_admin_cli_creates_a_hashed_administrator(app, seeded_no_admin):
    runner = app.test_cli_runner()
    result = runner.invoke(
        args=[
            "setup-admin",
            "--email",
            "cli.admin@example.com",
            "--password",
            "CliAdmin123",
            "--setup-secret",
            TEST_SETUP_SECRET,
        ]
    )
    assert result.exit_code == 0, result.output

    with app.app_context():
        account = User_Account.query.filter_by(username="cli.admin@example.com").one()
        assert account.role == "admin"
        assert account.password_hash != "CliAdmin123"
        assert check_password_hash(account.password_hash, "CliAdmin123")


def test_setup_admin_cli_rotates_in_place_without_deleting_clinical_data(app, seeded):
    runner = app.test_cli_runner()
    result = runner.invoke(
        args=[
            "setup-admin",
            "--rotate",
            "--email",
            "rotated.admin@example.com",
            "--password",
            "RotatedAdmin123",
        ],
        input="Admin@123\n",
    )
    assert result.exit_code == 0, result.output

    with app.app_context():
        account = User_Account.query.filter_by(username="rotated.admin@example.com").one()
        assert account.role == "admin"
        assert check_password_hash(account.password_hash, "RotatedAdmin123")

        from app.models import Appointment, Doctor, Patient

        assert Doctor.query.count() == 2
        assert Patient.query.count() == 2
        assert Appointment.query.count() == 5
