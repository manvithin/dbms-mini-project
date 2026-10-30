import os
import sys
from datetime import date, time, timedelta
from pathlib import Path

import pytest
from flask.testing import FlaskClient
from sqlalchemy import text
from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.config import TestConfig
from app.db_objects import install_database_objects
from app.extensions import db
from app.models import (
    Appointment,
    Department,
    Diagnosis,
    Doctor,
    Doctor_Schedule,
    Patient,
    Prescription,
    Test_Order,
    Test_Result,
    User_Account,
)
from app.seed import TABLES_IN_DELETE_ORDER
from app.services.availability import hospital_now

TEST_DATABASE_URI = os.getenv("TEST_DATABASE_URL", TestConfig.SQLALCHEMY_DATABASE_URI)
TEST_SETUP_SECRET = "test-admin-setup-secret-123"


class CsrfClient(FlaskClient):
    """Test client that keeps a session bound CSRF token in sync."""

    _csrf_token = None

    def get_csrf_token(self):
        if not self._csrf_token:
            response = super().open("/api/auth/csrf", method="GET")
            self._csrf_token = response.get_json()["csrf_token"]
        return self._csrf_token

    def open(self, *args, **kwargs):
        method = kwargs.get("method")
        if method is None and args:
            method = getattr(args[0], "method", "GET")
        method = (method or "GET").upper()
        if method not in {"GET", "HEAD", "OPTIONS", "TRACE"}:
            headers = kwargs.get("headers")
            if headers is None:
                headers = {}
            else:
                headers = dict(headers)
            if not any(key.lower() == "x-csrf-token" for key in headers):
                headers["X-CSRF-Token"] = self.get_csrf_token()
            kwargs["headers"] = headers
        response = super().open(*args, **kwargs)
        if response.is_json:
            payload = response.get_json(silent=True)
            if isinstance(payload, dict) and payload.get("csrf_token"):
                self._csrf_token = payload["csrf_token"]
        return response


@pytest.fixture(scope="session")
def app():
    application = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret-key",
            "SQLALCHEMY_DATABASE_URI": TEST_DATABASE_URI,
            "SESSION_COOKIE_SECURE": False,
            "CORS_ORIGINS": ["http://localhost:5173"],
            "ADMIN_SETUP_SECRET": TEST_SETUP_SECRET,
        }
    )
    application.test_client_class = CsrfClient
    with application.app_context():
        db.drop_all()
        db.create_all()
        install_database_objects()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def raw_client(app):
    """Client without automatic CSRF handling for negative tests."""
    return FlaskClient(app, app.response_class)


def clear_data():
    db.session.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
    for table in TABLES_IN_DELETE_ORDER:
        db.session.execute(text(f"DELETE FROM {table}"))
    for table in TABLES_IN_DELETE_ORDER:
        db.session.execute(text(f"ALTER TABLE {table} AUTO_INCREMENT = 1"))
    db.session.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    db.session.commit()


def create_base_data(include_admin=True):
    general = Department(
        department_name="General Medicine",
        description="First contact care for common illnesses and long term conditions.",
    )
    cardiology = Department(
        department_name="Cardiology",
        description="Heart health consultations and cardiac risk assessment.",
    )
    db.session.add_all([general, cardiology])
    db.session.flush()

    doctor_a = Doctor(
        name="Dr. Asha Rao",
        specialization="Internal Medicine",
        phone="+91 90000 10001",
        department=general,
        is_active=True,
    )
    doctor_b = Doctor(
        name="Dr. Vikram Shah",
        specialization="Cardiology",
        phone="+91 90000 10002",
        department=cardiology,
        is_active=True,
    )
    db.session.add_all([doctor_a, doctor_b])
    db.session.flush()

    patient_a = Patient(
        name="Riya Kapoor",
        date_of_birth=date(1992, 5, 14),
        gender="Female",
        phone="+91 90000 20001",
        address="12 Lake View Road, Bengaluru",
        blood_group="B positive",
        medical_history="Mild seasonal allergies.",
    )
    patient_b = Patient(
        name="Arjun Mehta",
        date_of_birth=date(1987, 11, 2),
        gender="Male",
        phone="+91 90000 20002",
        address="48 Park Street, Bengaluru",
        blood_group="O positive",
        medical_history="No known long term conditions.",
    )
    db.session.add_all([patient_a, patient_b])
    db.session.flush()

    accounts = [
        User_Account(
            username="asha.rao@example.com",
            password_hash=generate_password_hash("Doctor@123", method="pbkdf2:sha256:600000"),
            role="doctor",
            doctor=doctor_a,
            is_active=True,
        ),
        User_Account(
            username="vikram.shah@example.com",
            password_hash=generate_password_hash("Doctor@123", method="pbkdf2:sha256:600000"),
            role="doctor",
            doctor=doctor_b,
            is_active=True,
        ),
        User_Account(
            username="riya@example.com",
            password_hash=generate_password_hash("Patient@123", method="pbkdf2:sha256:600000"),
            role="patient",
            patient=patient_a,
            is_active=True,
        ),
        User_Account(
            username="arjun@example.com",
            password_hash=generate_password_hash("Patient@123", method="pbkdf2:sha256:600000"),
            role="patient",
            patient=patient_b,
            is_active=True,
        ),
    ]
    if include_admin:
        accounts.insert(
            0,
            User_Account(
                username="admin@example.com",
                password_hash=generate_password_hash(
                    "Admin@123", method="pbkdf2:sha256:600000"
                ),
                role="admin",
                is_active=True,
            ),
        )
    db.session.add_all(accounts)

    schedules = []
    for day in range(7):
        schedules.append(
            Doctor_Schedule(
                doctor=doctor_a,
                day_of_week=day,
                start_time=time(8, 0),
                end_time=time(17, 0),
                slot_duration_minutes=30,
                is_active=True,
            )
        )
        schedules.append(
            Doctor_Schedule(
                doctor=doctor_b,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(12, 0),
                slot_duration_minutes=30,
                is_active=True,
            )
        )
    db.session.add_all(schedules)
    db.session.flush()

    now = hospital_now()
    future_date = now.date() + timedelta(days=3)
    later_date = now.date() + timedelta(days=5)
    past_date = now.date() - timedelta(days=7)
    soon = now + timedelta(hours=1)
    soon_time = soon.time().replace(second=0, microsecond=0)

    booked = Appointment(
        patient=patient_a,
        doctor=doctor_a,
        appointment_date=future_date,
        appointment_time=time(9, 30),
        status="Booked",
        reason_for_visit="Persistent cough for one week.",
    )
    completed = Appointment(
        patient=patient_a,
        doctor=doctor_a,
        appointment_date=past_date,
        appointment_time=time(10, 0),
        status="Completed",
        reason_for_visit="Annual health review.",
    )
    other_patient = Appointment(
        patient=patient_b,
        doctor=doctor_b,
        appointment_date=future_date + timedelta(days=1),
        appointment_time=time(9, 30),
        status="Confirmed",
        reason_for_visit="Blood pressure review.",
    )
    cancelable = Appointment(
        patient=patient_a,
        doctor=doctor_a,
        appointment_date=later_date,
        appointment_time=time(10, 0),
        status="Booked",
        reason_for_visit="Follow up for cough.",
    )
    soon_appointment = Appointment(
        patient=patient_a,
        doctor=doctor_a,
        appointment_date=soon.date(),
        appointment_time=soon_time,
        status="Booked",
        reason_for_visit="Urgent review.",
    )
    db.session.add_all([booked, completed, other_patient, cancelable, soon_appointment])
    db.session.flush()

    test = Test_Order(
        appointment=completed,
        test_type="Complete blood count",
        status="Completed",
        notes="Routine screening during the annual review.",
    )
    result = Test_Result(
        test_order=test,
        result_summary="Haemoglobin 13.2 g/dL with normal white cell count.",
        remarks="Within the reported reference range.",
    )
    diagnosis = Diagnosis(
        appointment=completed,
        diagnosis_description="Mild iron deficiency anaemia.",
        notes="Diet review discussed and iron supplementation started.",
    )
    prescription = Prescription(
        diagnosis=diagnosis,
        treatment_plan="Oral iron supplement for eight weeks with a repeat blood count.",
        instructions="Take the tablet after food and report any stomach upset.",
        follow_up_date=now.date() + timedelta(days=21),
    )
    db.session.add_all([test, result, diagnosis, prescription])
    db.session.commit()

    return {
        "department_general_id": general.department_id,
        "department_cardiology_id": cardiology.department_id,
        "doctor_a_id": doctor_a.doctor_id,
        "doctor_b_id": doctor_b.doctor_id,
        "patient_a_id": patient_a.patient_id,
        "patient_b_id": patient_b.patient_id,
        "future_date": future_date.isoformat(),
        "future_date_value": future_date,
        "later_date": later_date.isoformat(),
        "past_date": past_date.isoformat(),
        "soon_date": soon.date().isoformat(),
        "booked_appointment_id": booked.appointment_id,
        "completed_appointment_id": completed.appointment_id,
        "other_patient_appointment_id": other_patient.appointment_id,
        "cancelable_appointment_id": cancelable.appointment_id,
        "soon_appointment_id": soon_appointment.appointment_id,
        "test_id": test.test_id,
        "diagnosis_id": diagnosis.diagnosis_id,
        "prescription_id": prescription.prescription_id,
    }


@pytest.fixture()
def seeded(app):
    with app.app_context():
        clear_data()
        data = create_base_data()
    yield data
    with app.app_context():
        db.session.remove()
        clear_data()


@pytest.fixture()
def seeded_no_admin(app):
    """Base data without an administrator so first time setup can be tested."""
    with app.app_context():
        clear_data()
        data = create_base_data(include_admin=False)
    yield data
    with app.app_context():
        db.session.remove()
        clear_data()


def login(client, email, password):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def logout(client):
    return client.post("/api/auth/logout")
