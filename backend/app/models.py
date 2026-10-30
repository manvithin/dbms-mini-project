from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Computed, Index, UniqueConstraint

from .extensions import db


def utcnow() -> datetime:
    """Return a naive UTC datetime for MySQL DATETIME columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


APPOINTMENT_STATUSES = (
    "Booked",
    "Confirmed",
    "Checked In",
    "In Consultation",
    "Completed",
    "Cancelled",
    "No Show",
)

ACTIVE_APPOINTMENT_STATUSES = (
    "Booked",
    "Confirmed",
    "Checked In",
    "In Consultation",
    "Completed",
)

TEST_STATUSES = ("Ordered", "Completed", "Cancelled")
USER_ROLES = ("patient", "doctor", "admin")
ADMIN_SETUP_KEY = "admin_setup_completed"
GENDERS = ("Female", "Male", "Other", "Prefer not to say")
BLOOD_GROUPS = ("A positive", "A negative", "B positive", "B negative", "AB positive", "AB negative", "O positive", "O negative", "Unknown")


class Patient(db.Model):
    __tablename__ = "patient"

    patient_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255))
    blood_group = db.Column(db.String(20), nullable=False, default="Unknown")
    medical_history = db.Column(db.Text)

    account = db.relationship("User_Account", back_populates="patient", uselist=False)
    appointments = db.relationship("Appointment", back_populates="patient", lazy="dynamic")

    __table_args__ = (
        CheckConstraint("gender IN ('Female', 'Male', 'Other', 'Prefer not to say')", name="ck_patient_gender"),
        CheckConstraint(
            "blood_group IN ('A positive', 'A negative', 'B positive', 'B negative', 'AB positive', 'AB negative', 'O positive', 'O negative', 'Unknown')",
            name="ck_patient_blood_group",
        ),
    )


class Department(db.Model):
    __tablename__ = "department"

    department_id = db.Column(db.Integer, primary_key=True)
    department_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)

    doctors = db.relationship("Doctor", back_populates="department", lazy="dynamic")

    __table_args__ = (UniqueConstraint("department_name", name="uq_department_name"),)


class Doctor(db.Model):
    __tablename__ = "doctor"

    doctor_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    specialization = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    department_id = db.Column(
        db.Integer,
        db.ForeignKey("department.department_id", ondelete="RESTRICT"),
        nullable=False,
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    department = db.relationship("Department", back_populates="doctors")
    account = db.relationship("User_Account", back_populates="doctor", uselist=False)
    schedules = db.relationship("Doctor_Schedule", back_populates="doctor", lazy="dynamic")
    time_off = db.relationship("Doctor_Time_Off", back_populates="doctor", lazy="dynamic")
    appointments = db.relationship("Appointment", back_populates="doctor", lazy="dynamic")

    __table_args__ = (
        Index("ix_doctor_department", "department_id"),
        Index("ix_doctor_active", "is_active"),
    )


class User_Account(db.Model):
    __tablename__ = "user_account"

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(190), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patient.patient_id", ondelete="CASCADE"),
        nullable=True,
    )
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor.doctor_id", ondelete="CASCADE"),
        nullable=True,
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    patient = db.relationship("Patient", back_populates="account")
    doctor = db.relationship("Doctor", back_populates="account")

    __table_args__ = (
        UniqueConstraint("username", name="uq_user_account_username"),
        UniqueConstraint("patient_id", name="uq_user_account_patient"),
        UniqueConstraint("doctor_id", name="uq_user_account_doctor"),
        CheckConstraint("role IN ('patient', 'doctor', 'admin')", name="ck_user_account_role"),
        CheckConstraint(
            "(role = 'patient' AND patient_id IS NOT NULL AND doctor_id IS NULL) OR "
            "(role = 'doctor' AND doctor_id IS NOT NULL AND patient_id IS NULL) OR "
            "(role = 'admin' AND patient_id IS NULL AND doctor_id IS NULL)",
            name="ck_user_account_role_link",
        ),
    )


class System_Setting(db.Model):
    __tablename__ = "system_setting"

    setting_key = db.Column(db.String(64), primary_key=True)
    setting_value = db.Column(db.String(255), nullable=False)


class Doctor_Schedule(db.Model):
    __tablename__ = "doctor_schedule"

    schedule_id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor.doctor_id", ondelete="CASCADE"),
        nullable=False,
    )
    day_of_week = db.Column(db.SmallInteger, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    slot_duration_minutes = db.Column(db.SmallInteger, nullable=False, default=30)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    doctor = db.relationship("Doctor", back_populates="schedules")

    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_schedule_day"),
        CheckConstraint("end_time > start_time", name="ck_schedule_time_range"),
        CheckConstraint(
            "slot_duration_minutes BETWEEN 5 AND 240",
            name="ck_schedule_slot_duration",
        ),
        Index("ix_schedule_doctor_day", "doctor_id", "day_of_week"),
    )


class Doctor_Time_Off(db.Model):
    __tablename__ = "doctor_time_off"

    time_off_id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor.doctor_id", ondelete="CASCADE"),
        nullable=False,
    )
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(255))

    doctor = db.relationship("Doctor", back_populates="time_off")

    __table_args__ = (
        CheckConstraint("end_datetime > start_datetime", name="ck_time_off_range"),
        Index("ix_time_off_doctor_start", "doctor_id", "start_datetime"),
    )


class Appointment(db.Model):
    __tablename__ = "appointment"

    appointment_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(
        db.Integer,
        db.ForeignKey("patient.patient_id", ondelete="RESTRICT"),
        nullable=False,
    )
    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey("doctor.doctor_id", ondelete="RESTRICT"),
        nullable=False,
    )
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Booked")
    reason_for_visit = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    # The generated column is 1 while the slot is occupied and NULL after cancellation.
    # A unique index on this nullable column prevents two active bookings for one slot.
    slot_active = db.Column(
        db.SmallInteger,
        Computed(
            "CASE WHEN status IN ('Booked', 'Confirmed', 'Checked In', "
            "'In Consultation', 'Completed') THEN 1 ELSE NULL END",
            persisted=True,
        ),
    )

    patient = db.relationship("Patient", back_populates="appointments")
    doctor = db.relationship("Doctor", back_populates="appointments")
    tests = db.relationship(
        "Test_Order",
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="Test_Order.test_id",
    )
    diagnosis = db.relationship(
        "Diagnosis",
        back_populates="appointment",
        uselist=False,
        cascade="all, delete-orphan",
    )
    status_history = db.relationship(
        "Appointment_Status_History",
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="Appointment_Status_History.changed_at",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('Booked', 'Confirmed', 'Checked In', 'In Consultation', "
            "'Completed', 'Cancelled', 'No Show')",
            name="ck_appointment_status",
        ),
        UniqueConstraint(
            "doctor_id",
            "appointment_date",
            "appointment_time",
            "slot_active",
            name="uq_doctor_active_slot",
        ),
        Index("ix_appointment_doctor_date", "doctor_id", "appointment_date", "appointment_time"),
        Index("ix_appointment_patient_date", "patient_id", "appointment_date"),
        Index("ix_appointment_status", "status"),
    )


class Test_Order(db.Model):
    __tablename__ = "test_order"

    test_id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointment.appointment_id", ondelete="CASCADE"),
        nullable=False,
    )
    test_type = db.Column(db.String(120), nullable=False)
    order_date = db.Column(db.DateTime, nullable=False, default=utcnow)
    status = db.Column(db.String(20), nullable=False, default="Ordered")
    notes = db.Column(db.Text)

    appointment = db.relationship("Appointment", back_populates="tests")
    result = db.relationship(
        "Test_Result",
        back_populates="test_order",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint("status IN ('Ordered', 'Completed', 'Cancelled')", name="ck_test_order_status"),
        Index("ix_test_order_appointment", "appointment_id"),
    )


class Test_Result(db.Model):
    __tablename__ = "test_result"

    result_id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(
        db.Integer,
        db.ForeignKey("test_order.test_id", ondelete="CASCADE"),
        nullable=False,
    )
    result_date = db.Column(db.DateTime, nullable=False, default=utcnow)
    result_summary = db.Column(db.Text, nullable=False)
    remarks = db.Column(db.Text)

    test_order = db.relationship("Test_Order", back_populates="result")

    __table_args__ = (UniqueConstraint("test_id", name="uq_test_result_test"),)


class Diagnosis(db.Model):
    __tablename__ = "diagnosis"

    diagnosis_id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointment.appointment_id", ondelete="CASCADE"),
        nullable=False,
    )
    diagnosis_description = db.Column(db.Text, nullable=False)
    diagnosis_date = db.Column(db.DateTime, nullable=False, default=utcnow)
    notes = db.Column(db.Text)

    appointment = db.relationship("Appointment", back_populates="diagnosis")
    prescription = db.relationship(
        "Prescription",
        back_populates="diagnosis",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (UniqueConstraint("appointment_id", name="uq_diagnosis_appointment"),)


class Prescription(db.Model):
    __tablename__ = "prescription"

    prescription_id = db.Column(db.Integer, primary_key=True)
    diagnosis_id = db.Column(
        db.Integer,
        db.ForeignKey("diagnosis.diagnosis_id", ondelete="CASCADE"),
        nullable=False,
    )
    treatment_plan = db.Column(db.Text, nullable=False)
    instructions = db.Column(db.Text, nullable=False)
    follow_up_date = db.Column(db.Date)

    diagnosis = db.relationship("Diagnosis", back_populates="prescription")

    __table_args__ = (UniqueConstraint("diagnosis_id", name="uq_prescription_diagnosis"),)


class Appointment_Status_History(db.Model):
    __tablename__ = "appointment_status_history"

    history_id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer,
        db.ForeignKey("appointment.appointment_id", ondelete="CASCADE"),
        nullable=False,
    )
    old_status = db.Column(db.String(20), nullable=False)
    new_status = db.Column(db.String(20), nullable=False)
    changed_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    appointment = db.relationship("Appointment", back_populates="status_history")

    __table_args__ = (Index("ix_status_history_appointment", "appointment_id", "changed_at"),)


