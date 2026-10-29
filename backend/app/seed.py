from datetime import date, datetime, time, timedelta

from sqlalchemy import text
from werkzeug.security import generate_password_hash

from .extensions import db
from .models import (
    Appointment,
    Appointment_Status_History,
    Department,
    Diagnosis,
    Doctor,
    Doctor_Schedule,
    Doctor_Time_Off,
    Patient,
    Prescription,
    Test_Order,
    Test_Result,
    User_Account,
    utcnow,
)
from .services.availability import hospital_now

DEMO_ACCOUNTS = [
    ("admin@cityhospital.example", "Admin@123", "Administrator"),
    ("meera.iyer@example.com", "Doctor@123", "Dr. Meera Iyer"),
    ("riya.kapoor@example.com", "Patient@123", "Riya Kapoor"),
]

TABLES_IN_DELETE_ORDER = (
    "appointment_status_history",
    "test_result",
    "test_order",
    "prescription",
    "diagnosis",
    "appointment",
    "user_account",
    "doctor_schedule",
    "doctor_time_off",
    "doctor",
    "patient",
    "department",
)


def password_hash(password):
    return generate_password_hash(password, method="pbkdf2:sha256:600000")


def next_weekday(weekday, include_today=False):
    today = hospital_now().date()
    days = (weekday - today.weekday()) % 7
    if days == 0 and not include_today:
        days = 7
    return today + timedelta(days=days)


def last_weekday(weekday):
    today = hospital_now().date()
    days = (today.weekday() - weekday) % 7
    if days == 0:
        days = 7
    return today - timedelta(days=days)


def at(target_date, hour, minute=0):
    return datetime.combine(target_date, time(hour, minute))


def clear_demo_data():
    for table in TABLES_IN_DELETE_ORDER:
        db.session.execute(text(f"DELETE FROM {table}"))
    for table in TABLES_IN_DELETE_ORDER:
        db.session.execute(text(f"ALTER TABLE {table} AUTO_INCREMENT = 1"))
    db.session.commit()


def seed_demo_data(reset=False):
    if not reset and Patient.query.count() > 0:
        raise RuntimeError("Demo data already exists. Run reset-demo to replace it.")
    if reset:
        clear_demo_data()

    departments = {
        "General Medicine": Department(
            department_name="General Medicine",
            description="First contact care for common illnesses, long term conditions, and preventive health reviews.",
        ),
        "Cardiology": Department(
            department_name="Cardiology",
            description="Heart health consultations, blood pressure review, and cardiac risk assessment.",
        ),
        "Paediatrics": Department(
            department_name="Paediatrics",
            description="Outpatient care for infants, children, and adolescents.",
        ),
        "Orthopaedics": Department(
            department_name="Orthopaedics",
            description="Assessment of bone, joint, and muscle concerns.",
        ),
        "Dermatology": Department(
            department_name="Dermatology",
            description="Care for skin, hair, and nail conditions.",
        ),
        "Ear Nose and Throat": Department(
            department_name="Ear Nose and Throat",
            description="Outpatient care for ear, nose, throat, and voice concerns.",
        ),
    }
    db.session.add_all(departments.values())
    db.session.flush()

    doctor_specs = [
        (
            "Dr. Meera Iyer",
            "Internal Medicine",
            "+91 98765 43210",
            "General Medicine",
            "meera.iyer@example.com",
        ),
        (
            "Dr. Rohan Das",
            "Interventional Cardiology",
            "+91 98765 43211",
            "Cardiology",
            "rohan.das@example.com",
        ),
        (
            "Dr. Ananya Rao",
            "Child Health",
            "+91 98765 43212",
            "Paediatrics",
            "ananya.rao@example.com",
        ),
        (
            "Dr. Kabir Singh",
            "Joint and Bone Care",
            "+91 98765 43213",
            "Orthopaedics",
            "kabir.singh@example.com",
        ),
        (
            "Dr. Neha Kulkarni",
            "Skin and Hair Care",
            "+91 98765 43214",
            "Dermatology",
            "neha.kulkarni@example.com",
        ),
        (
            "Dr. Vikram Menon",
            "Ear Nose and Throat Care",
            "+91 98765 43215",
            "Ear Nose and Throat",
            "vikram.menon@example.com",
        ),
    ]
    doctors = {}
    for name, specialization, phone, department_name, email in doctor_specs:
        doctor = Doctor(
            name=name,
            specialization=specialization,
            phone=phone,
            department=departments[department_name],
            is_active=True,
        )
        account = User_Account(
            username=email,
            password_hash=password_hash("Doctor@123"),
            role="doctor",
            doctor=doctor,
            is_active=True,
        )
        db.session.add_all([doctor, account])
        doctors[name] = doctor
    db.session.flush()

    schedule_specs = [
        ("Dr. Meera Iyer", 0, "09:00", "13:00", 30),
        ("Dr. Meera Iyer", 1, "09:00", "13:00", 30),
        ("Dr. Meera Iyer", 2, "09:00", "13:00", 30),
        ("Dr. Meera Iyer", 2, "14:00", "17:00", 30),
        ("Dr. Meera Iyer", 3, "09:00", "13:00", 30),
        ("Dr. Meera Iyer", 4, "09:00", "13:00", 30),
        ("Dr. Rohan Das", 0, "10:00", "14:00", 30),
        ("Dr. Rohan Das", 2, "10:00", "14:00", 30),
        ("Dr. Rohan Das", 4, "10:00", "14:00", 30),
        ("Dr. Ananya Rao", 1, "09:30", "13:30", 30),
        ("Dr. Ananya Rao", 3, "09:30", "13:30", 30),
        ("Dr. Ananya Rao", 5, "09:00", "12:00", 30),
        ("Dr. Kabir Singh", 0, "15:00", "18:00", 30),
        ("Dr. Kabir Singh", 1, "15:00", "18:00", 30),
        ("Dr. Kabir Singh", 3, "15:00", "18:00", 30),
        ("Dr. Neha Kulkarni", 2, "11:00", "15:00", 30),
        ("Dr. Neha Kulkarni", 4, "11:00", "15:00", 30),
        ("Dr. Vikram Menon", 0, "09:00", "12:00", 20),
        ("Dr. Vikram Menon", 2, "09:00", "12:00", 20),
    ]
    for doctor_name, day, start, end, duration in schedule_specs:
        start_time = time.fromisoformat(start)
        end_time = time.fromisoformat(end)
        db.session.add(
            Doctor_Schedule(
                doctor=doctors[doctor_name],
                day_of_week=day,
                start_time=start_time,
                end_time=end_time,
                slot_duration_minutes=duration,
                is_active=True,
            )
        )

    next_wednesday = next_weekday(2)
    next_friday = next_weekday(4)
    db.session.add_all(
        [
            Doctor_Time_Off(
                doctor=doctors["Dr. Meera Iyer"],
                start_datetime=at(next_wednesday, 10),
                end_datetime=at(next_wednesday, 12),
                reason="Hospital committee meeting",
            ),
            Doctor_Time_Off(
                doctor=doctors["Dr. Rohan Das"],
                start_datetime=at(next_friday, 12),
                end_datetime=at(next_friday, 14),
                reason="Clinical training session",
            ),
        ]
    )

    patients = {
        "Riya Kapoor": Patient(
            name="Riya Kapoor",
            date_of_birth=date(1996, 4, 12),
            gender="Female",
            phone="+91 90000 11001",
            address="14 Rose Lane, Bengaluru",
            blood_group="B positive",
            medical_history="Seasonal allergies. No long term medication.",
        ),
        "Arjun Mehta": Patient(
            name="Arjun Mehta",
            date_of_birth=date(1988, 9, 23),
            gender="Male",
            phone="+91 90000 11002",
            address="27 Lake View Road, Bengaluru",
            blood_group="O positive",
            medical_history="High blood pressure, on regular medication.",
        ),
        "Sara Thomas": Patient(
            name="Sara Thomas",
            date_of_birth=date(2001, 1, 15),
            gender="Female",
            phone="+91 90000 11003",
            address="5 Garden Street, Bengaluru",
            blood_group="A positive",
            medical_history="No known long term conditions.",
        ),
        "Dev Patel": Patient(
            name="Dev Patel",
            date_of_birth=date(1975, 6, 30),
            gender="Male",
            phone="+91 90000 11004",
            address="88 Hill Road, Bengaluru",
            blood_group="AB positive",
            medical_history="Type 2 diabetes, managed with diet and medication.",
        ),
    }
    patient_passwords = {
        "Riya Kapoor": "riya.kapoor@example.com",
        "Arjun Mehta": "arjun.mehta@example.com",
        "Sara Thomas": "sara.thomas@example.com",
        "Dev Patel": "dev.patel@example.com",
    }
    for name, patient in patients.items():
        db.session.add(patient)
        db.session.add(
            User_Account(
                username=patient_passwords[name],
                password_hash=password_hash("Patient@123"),
                role="patient",
                patient=patient,
                is_active=True,
            )
        )
    db.session.add(
        User_Account(
            username="admin@cityhospital.example",
            password_hash=password_hash("Admin@123"),
            role="admin",
            is_active=True,
        )
    )
    db.session.flush()

    today = hospital_now().date()
    appointments = []

    def add_appointment(
        patient,
        doctor,
        appointment_date,
        appointment_time,
        status,
        reason,
        history=None,
        updated_days_ago=0,
    ):
        appointment = Appointment(
            patient=patient,
            doctor=doctor,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status=status,
            reason_for_visit=reason,
            created_at=utcnow() - timedelta(days=max(1, updated_days_ago + 2)),
            updated_at=utcnow() - timedelta(days=updated_days_ago),
        )
        db.session.add(appointment)
        db.session.flush()
        if history:
            for old_status, new_status, days_ago in history:
                db.session.add(
                    Appointment_Status_History(
                        appointment_id=appointment.appointment_id,
                        old_status=old_status,
                        new_status=new_status,
                        changed_at=utcnow() - timedelta(days=days_ago),
                    )
                )
        appointments.append(appointment)
        return appointment

    today_checked_in = add_appointment(
        patients["Arjun Mehta"],
        doctors["Dr. Meera Iyer"],
        today,
        time(9, 0),
        "Checked In",
        "Blood pressure review and dizziness.",
        history=[("Booked", "Confirmed", 2), ("Confirmed", "Checked In", 0)],
        updated_days_ago=0,
    )
    today_booked = add_appointment(
        patients["Riya Kapoor"],
        doctors["Dr. Meera Iyer"],
        today,
        time(11, 30),
        "Booked",
        "Seasonal allergy review.",
        updated_days_ago=1,
    )

    next_monday = next_weekday(0)
    add_appointment(
        patients["Riya Kapoor"],
        doctors["Dr. Meera Iyer"],
        next_monday,
        time(9, 0),
        "Booked",
        "Recurring headache and fatigue.",
        updated_days_ago=1,
    )

    next_tuesday = next_weekday(1)
    add_appointment(
        patients["Sara Thomas"],
        doctors["Dr. Ananya Rao"],
        next_tuesday,
        time(10, 0),
        "Confirmed",
        "General health review and fatigue.",
        history=[("Booked", "Confirmed", 1)],
        updated_days_ago=1,
    )

    next_wednesday_for_neha = next_weekday(2)
    add_appointment(
        patients["Dev Patel"],
        doctors["Dr. Neha Kulkarni"],
        next_wednesday_for_neha,
        time(12, 0),
        "Cancelled",
        "Skin rash assessment.",
        history=[("Booked", "Cancelled", 2)],
        updated_days_ago=2,
    )

    last_thursday = last_weekday(3)
    last_friday = last_weekday(4)
    completed_riya_date = today - timedelta(days=21)
    completed_arjun_date = today - timedelta(days=8)
    completed_sara_date = today - timedelta(days=3)

    completed_riya = add_appointment(
        patients["Riya Kapoor"],
        doctors["Dr. Meera Iyer"],
        completed_riya_date,
        time(9, 30),
        "Completed",
        "Persistent cough and mild fever.",
        history=[
            ("Booked", "Confirmed", 23),
            ("Confirmed", "Checked In", 21),
            ("Checked In", "In Consultation", 21),
            ("In Consultation", "Completed", 21),
        ],
        updated_days_ago=21,
    )
    test = Test_Order(
        appointment=completed_riya,
        test_type="Chest X ray",
        order_date=datetime.combine(completed_riya_date, time(10, 0)),
        status="Completed",
        notes="Ordered during consultation for a persistent cough.",
    )
    db.session.add(test)
    db.session.flush()
    db.session.add(
        Test_Result(
            test_id=test.test_id,
            result_date=datetime.combine(completed_riya_date + timedelta(days=1), time(9, 0)),
            result_summary="Chest X ray shows clear lung fields. No active infection seen.",
            remarks="Reviewed by the treating doctor.",
        )
    )
    diagnosis = Diagnosis(
        appointment=completed_riya,
        diagnosis_description="Acute bronchitis",
        diagnosis_date=datetime.combine(completed_riya_date, time(11, 0)),
        notes="Symptoms are consistent with a viral chest infection.",
    )
    db.session.add(diagnosis)
    db.session.flush()
    db.session.add(
        Prescription(
            diagnosis=diagnosis,
            treatment_plan="Rest, warm fluids, and steam inhalation for five days.",
            instructions="Take the prescribed cough syrup at night. Return if fever rises above 101 F.",
            follow_up_date=completed_riya_date + timedelta(days=27),
        )
    )

    completed_arjun = add_appointment(
        patients["Arjun Mehta"],
        doctors["Dr. Rohan Das"],
        completed_arjun_date,
        time(10, 30),
        "Completed",
        "Routine blood pressure review.",
        history=[
            ("Booked", "Confirmed", 9),
            ("Confirmed", "Checked In", 7),
            ("Checked In", "In Consultation", 7),
            ("In Consultation", "Completed", 7),
        ],
        updated_days_ago=7,
    )
    diagnosis = Diagnosis(
        appointment=completed_arjun,
        diagnosis_description="Essential hypertension",
        diagnosis_date=datetime.combine(completed_arjun_date, time(11, 0)),
        notes="Blood pressure remains above the target range.",
    )
    db.session.add(diagnosis)
    db.session.flush()
    db.session.add(
        Prescription(
            diagnosis=diagnosis,
            treatment_plan="Continue the current blood pressure medication.",
            instructions="Check blood pressure twice a week and reduce salt intake.",
            follow_up_date=completed_arjun_date + timedelta(days=30),
        )
    )

    completed_sara = add_appointment(
        patients["Sara Thomas"],
        doctors["Dr. Kabir Singh"],
        completed_sara_date,
        time(15, 30),
        "Completed",
        "Right knee pain after a morning walk.",
        history=[
            ("Booked", "Confirmed", 5),
            ("Confirmed", "Checked In", 3),
            ("Checked In", "In Consultation", 3),
            ("In Consultation", "Completed", 3),
        ],
        updated_days_ago=3,
    )
    db.session.add(
        Test_Order(
            appointment=completed_sara,
            test_type="Knee X ray",
            order_date=datetime.combine(completed_sara_date, time(16, 0)),
            status="Ordered",
            notes="Report is awaited. Patient will collect it from the diagnostic desk.",
        )
    )
    diagnosis = Diagnosis(
        appointment=completed_sara,
        diagnosis_description="Mild knee strain",
        diagnosis_date=datetime.combine(completed_sara_date, time(16, 15)),
        notes="No major injury seen on examination.",
    )
    db.session.add(diagnosis)
    db.session.flush()
    db.session.add(
        Prescription(
            diagnosis=diagnosis,
            treatment_plan="Physiotherapy for two weeks and avoid long walks.",
            instructions="Apply a cold pack for ten minutes in the evening. Return if swelling increases.",
            follow_up_date=completed_sara_date + timedelta(days=14),
        )
    )

    add_appointment(
        patients["Dev Patel"],
        doctors["Dr. Vikram Menon"],
        last_thursday,
        time(9, 20),
        "No Show",
        "Ear pain review.",
        history=[("Booked", "No Show", 10)],
        updated_days_ago=10,
    )
    add_appointment(
        patients["Sara Thomas"],
        doctors["Dr. Neha Kulkarni"],
        last_friday,
        time(11, 30),
        "Completed",
        "Itchy skin patches on both arms.",
        history=[
            ("Booked", "Confirmed", 14),
            ("Confirmed", "Checked In", 12),
            ("Checked In", "In Consultation", 12),
            ("In Consultation", "Completed", 12),
        ],
        updated_days_ago=12,
    )

    db.session.commit()
    return {
        "departments": Department.query.count(),
        "doctors": Doctor.query.count(),
        "patients": Patient.query.count(),
        "appointments": Appointment.query.count(),
        "demo_checked_in_appointment": today_checked_in.appointment_id,
        "demo_today_booked_appointment": today_booked.appointment_id,
    }
