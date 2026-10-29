from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from ..errors import ApiError
from ..extensions import db


def book_appointment(patient_id, doctor_id, appointment_date, appointment_time, reason):
    """Call the stored procedure that locks the doctor row and creates the booking."""
    raw = db.engine.raw_connection()
    cursor = raw.cursor()
    try:
        cursor.execute(
            "CALL sp_book_appointment(%s, %s, %s, %s, %s, @appointment_id, @message)",
            (patient_id, doctor_id, appointment_date, appointment_time, reason),
        )
        cursor.execute("SELECT @appointment_id, @message")
        appointment_id, message = cursor.fetchone()
        raw.commit()
    except OperationalError:
        raw.rollback()
        raise
    except Exception:
        raw.rollback()
        raise
    finally:
        cursor.close()
        raw.close()

    if appointment_id:
        return appointment_id, message

    if message == "This slot is no longer available. Please choose another time.":
        raise ApiError(message, 409, "slot_conflict")
    if message == "The doctor is unavailable at this time.":
        raise ApiError(message, 409, "doctor_unavailable")
    raise ApiError(message or "The appointment could not be saved.", 400, "booking_failed")


def procedure_exists():
    result = db.session.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.routines "
            "WHERE routine_schema = DATABASE() AND routine_name = 'sp_book_appointment'"
        )
    ).scalar()
    return bool(result)
