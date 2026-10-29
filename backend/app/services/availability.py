from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from flask import current_app

from ..models import ACTIVE_APPOINTMENT_STATUSES, Appointment, Doctor_Schedule, Doctor_Time_Off


def hospital_now():
    """Return the current hospital local time as a naive datetime."""
    zone_name = current_app.config.get("APP_TIMEZONE", "Asia/Kolkata")
    try:
        zone = ZoneInfo(zone_name)
    except Exception:
        zone = None
    if zone is None:
        return datetime.now()
    return datetime.now(zone).replace(tzinfo=None)


def day_bounds(target_date):
    start = datetime.combine(target_date, time.min)
    return start, start + timedelta(days=1)


def schedule_overlaps(doctor_id, day_of_week, start_time, end_time, exclude_schedule_id=None):
    query = Doctor_Schedule.query.filter(
        Doctor_Schedule.doctor_id == doctor_id,
        Doctor_Schedule.day_of_week == day_of_week,
        Doctor_Schedule.is_active.is_(True),
        Doctor_Schedule.start_time < end_time,
        Doctor_Schedule.end_time > start_time,
    )
    if exclude_schedule_id is not None:
        query = query.filter(Doctor_Schedule.schedule_id != exclude_schedule_id)
    return query.first() is not None


def time_off_overlaps(doctor_id, start_datetime, end_datetime, exclude_id=None):
    query = Doctor_Time_Off.query.filter(
        Doctor_Time_Off.doctor_id == doctor_id,
        Doctor_Time_Off.start_datetime < end_datetime,
        Doctor_Time_Off.end_datetime > start_datetime,
    )
    if exclude_id is not None:
        query = query.filter(Doctor_Time_Off.time_off_id != exclude_id)
    return query.first() is not None


def calculate_availability(doctor, target_date, now=None):
    """Build real slots from active schedules, time off, and active appointments."""
    now = now or hospital_now()
    if doctor is None or not doctor.is_active:
        return []

    if target_date < now.date():
        return []

    schedules = (
        Doctor_Schedule.query.filter_by(
            doctor_id=doctor.doctor_id,
            day_of_week=target_date.weekday(),
            is_active=True,
        )
        .order_by(Doctor_Schedule.start_time)
        .all()
    )
    if not schedules:
        return []

    day_start, day_end = day_bounds(target_date)
    time_off_entries = Doctor_Time_Off.query.filter(
        Doctor_Time_Off.doctor_id == doctor.doctor_id,
        Doctor_Time_Off.start_datetime < day_end,
        Doctor_Time_Off.end_datetime > day_start,
    ).all()

    booked = (
        Appointment.query.filter(
            Appointment.doctor_id == doctor.doctor_id,
            Appointment.appointment_date == target_date,
            Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        )
        .with_entities(Appointment.appointment_time)
        .all()
    )
    booked_times = [row[0] for row in booked]

    slots = []
    seen = set()
    for schedule in schedules:
        duration = timedelta(minutes=schedule.slot_duration_minutes)
        cursor = datetime.combine(target_date, schedule.start_time)
        schedule_end = datetime.combine(target_date, schedule.end_time)
        while cursor + duration <= schedule_end:
            slot_start = cursor
            slot_end = cursor + duration
            label = slot_start.strftime("%H:%M")
            if label in seen:
                cursor = slot_end
                continue

            if target_date == now.date() and slot_start <= now:
                cursor = slot_end
                continue

            blocked_by_time_off = any(
                entry.start_datetime < slot_end and entry.end_datetime > slot_start
                for entry in time_off_entries
            )
            if blocked_by_time_off:
                cursor = slot_end
                continue

            occupied = any(
                slot_start <= datetime.combine(target_date, booked_time) < slot_end
                for booked_time in booked_times
            )
            if occupied:
                cursor = slot_end
                continue

            seen.add(label)
            slots.append(
                {
                    "start_time": label,
                    "end_time": slot_end.strftime("%H:%M"),
                    "duration_minutes": schedule.slot_duration_minutes,
                }
            )
            cursor = slot_end

    slots.sort(key=lambda item: item["start_time"])
    return slots


def is_slot_available(doctor, target_date, target_time, now=None):
    return any(slot["start_time"] == target_time.strftime("%H:%M") for slot in calculate_availability(doctor, target_date, now))


def patient_can_cancel(appointment, now=None):
    now = now or hospital_now()
    if appointment.status not in ("Booked", "Confirmed"):
        return False
    appointment_start = datetime.combine(appointment.appointment_date, appointment.appointment_time)
    return appointment_start >= now + timedelta(hours=2)


def admin_can_cancel(appointment):
    return appointment.status in ("Booked", "Confirmed", "Checked In")


DOCTOR_STATUS_TRANSITIONS = {
    "Booked": {"Confirmed", "Checked In", "Cancelled", "No Show"},
    "Confirmed": {"Checked In", "Cancelled", "No Show"},
    "Checked In": {"In Consultation", "Cancelled"},
    "In Consultation": {"Completed"},
    "Completed": set(),
    "Cancelled": set(),
    "No Show": set(),
}


def doctor_can_change_status(current_status, new_status):
    return new_status in DOCTOR_STATUS_TRANSITIONS.get(current_status, set())


def can_write_clinical_records(appointment):
    return appointment.status in ("Checked In", "In Consultation", "Completed")
