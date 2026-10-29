from datetime import timezone

DAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def iso_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def hhmm(value):
    if value is None:
        return None
    return value.strftime("%H:%M")


def serialize_patient(patient, include_account=False):
    data = {
        "patient_id": patient.patient_id,
        "name": patient.name,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "gender": patient.gender,
        "phone": patient.phone,
        "address": patient.address,
        "blood_group": patient.blood_group,
        "medical_history": patient.medical_history,
    }
    if include_account and patient.account:
        data["email"] = patient.account.username
    return data


def serialize_patient_mini(patient):
    return {
        "patient_id": patient.patient_id,
        "name": patient.name,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "gender": patient.gender,
        "phone": patient.phone,
        "blood_group": patient.blood_group,
    }


def serialize_department(department, doctor_count=None):
    data = {
        "department_id": department.department_id,
        "department_name": department.department_name,
        "description": department.description,
    }
    if doctor_count is not None:
        data["doctor_count"] = doctor_count
    return data


def serialize_doctor(doctor, include_account=False):
    data = {
        "doctor_id": doctor.doctor_id,
        "name": doctor.name,
        "specialization": doctor.specialization,
        "phone": doctor.phone,
        "department_id": doctor.department_id,
        "department_name": doctor.department.department_name if doctor.department else None,
        "is_active": doctor.is_active,
    }
    if include_account and doctor.account:
        data["email"] = doctor.account.username
        data["account_active"] = doctor.account.is_active
    return data


def serialize_user(user):
    data = {
        "user_id": user.user_id,
        "email": user.username,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": iso_utc(user.created_at),
        "patient_id": user.patient_id,
        "doctor_id": user.doctor_id,
    }
    if user.patient:
        data["name"] = user.patient.name
        data["patient"] = serialize_patient(user.patient)
    elif user.doctor:
        data["name"] = user.doctor.name
        data["doctor"] = serialize_doctor(user.doctor)
    else:
        data["name"] = "Administrator"
    return data


def serialize_schedule(schedule):
    return {
        "schedule_id": schedule.schedule_id,
        "doctor_id": schedule.doctor_id,
        "doctor_name": schedule.doctor.name if schedule.doctor else None,
        "department_name": schedule.doctor.department.department_name if schedule.doctor and schedule.doctor.department else None,
        "day_of_week": schedule.day_of_week,
        "day_name": DAY_NAMES[schedule.day_of_week],
        "start_time": hhmm(schedule.start_time),
        "end_time": hhmm(schedule.end_time),
        "slot_duration_minutes": schedule.slot_duration_minutes,
        "is_active": schedule.is_active,
    }


def serialize_time_off(entry):
    return {
        "time_off_id": entry.time_off_id,
        "doctor_id": entry.doctor_id,
        "doctor_name": entry.doctor.name if entry.doctor else None,
        "start_datetime": entry.start_datetime.isoformat(timespec="minutes") if entry.start_datetime else None,
        "end_datetime": entry.end_datetime.isoformat(timespec="minutes") if entry.end_datetime else None,
        "reason": entry.reason,
    }


def serialize_test_result(result):
    if not result:
        return None
    return {
        "result_id": result.result_id,
        "test_id": result.test_id,
        "result_date": iso_utc(result.result_date),
        "result_summary": result.result_summary,
        "remarks": result.remarks,
    }


def serialize_test_order(test):
    return {
        "test_id": test.test_id,
        "appointment_id": test.appointment_id,
        "test_type": test.test_type,
        "order_date": iso_utc(test.order_date),
        "status": test.status,
        "notes": test.notes,
        "result": serialize_test_result(test.result),
    }


def serialize_prescription(prescription):
    if not prescription:
        return None
    return {
        "prescription_id": prescription.prescription_id,
        "diagnosis_id": prescription.diagnosis_id,
        "treatment_plan": prescription.treatment_plan,
        "instructions": prescription.instructions,
        "follow_up_date": prescription.follow_up_date.isoformat() if prescription.follow_up_date else None,
    }


def serialize_diagnosis(diagnosis):
    if not diagnosis:
        return None
    return {
        "diagnosis_id": diagnosis.diagnosis_id,
        "appointment_id": diagnosis.appointment_id,
        "diagnosis_description": diagnosis.diagnosis_description,
        "diagnosis_date": iso_utc(diagnosis.diagnosis_date),
        "notes": diagnosis.notes,
        "prescription": serialize_prescription(diagnosis.prescription),
    }


def serialize_status_history(entry):
    return {
        "history_id": entry.history_id,
        "old_status": entry.old_status,
        "new_status": entry.new_status,
        "changed_at": iso_utc(entry.changed_at),
    }


def serialize_appointment(appointment):
    return {
        "appointment_id": appointment.appointment_id,
        "patient_id": appointment.patient_id,
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment.appointment_date.isoformat(),
        "appointment_time": hhmm(appointment.appointment_time),
        "status": appointment.status,
        "reason_for_visit": appointment.reason_for_visit,
        "created_at": iso_utc(appointment.created_at),
        "updated_at": iso_utc(appointment.updated_at),
        "patient": serialize_patient_mini(appointment.patient) if appointment.patient else None,
        "doctor": serialize_doctor(appointment.doctor) if appointment.doctor else None,
        "test_count": len(appointment.tests),
        "has_diagnosis": appointment.diagnosis is not None,
        "has_prescription": bool(appointment.diagnosis and appointment.diagnosis.prescription),
    }


def serialize_appointment_detail(appointment):
    data = serialize_appointment(appointment)
    data["patient"] = serialize_patient(appointment.patient) if appointment.patient else None
    data["tests"] = [serialize_test_order(test) for test in appointment.tests]
    data["diagnosis"] = serialize_diagnosis(appointment.diagnosis)
    data["status_history"] = [serialize_status_history(entry) for entry in appointment.status_history]
    return data
