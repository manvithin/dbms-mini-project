from sqlalchemy import text

from .extensions import db

DROP_TRIGGER_SQL = "DROP TRIGGER IF EXISTS trg_appointment_status_audit"

CREATE_TRIGGER_SQL = """
CREATE TRIGGER trg_appointment_status_audit
BEFORE UPDATE ON appointment
FOR EACH ROW
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO appointment_status_history
            (appointment_id, old_status, new_status, changed_at)
        VALUES
            (OLD.appointment_id, OLD.status, NEW.status, UTC_TIMESTAMP());
    END IF;
    SET NEW.updated_at = UTC_TIMESTAMP();
END
"""

DROP_PROCEDURE_SQL = "DROP PROCEDURE IF EXISTS sp_book_appointment"

CREATE_PROCEDURE_SQL = """
CREATE PROCEDURE sp_book_appointment(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_date DATE,
    IN p_time TIME,
    IN p_reason VARCHAR(500),
    OUT p_appointment_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_doctor_active TINYINT DEFAULT NULL;
    DECLARE v_schedule_id INT DEFAULT NULL;
    DECLARE v_duration INT DEFAULT NULL;
    DECLARE v_time_off_count INT DEFAULT 0;
    DECLARE v_conflict_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_appointment_id = NULL;
        SET p_message = 'The appointment could not be saved.';
        RESIGNAL;
    END;

    SET p_appointment_id = NULL;
    SET p_message = '';

    START TRANSACTION;

    SELECT is_active INTO v_doctor_active
    FROM doctor
    WHERE doctor_id = p_doctor_id
    FOR UPDATE;

    IF v_doctor_active IS NULL THEN
        ROLLBACK;
        SET p_message = 'Doctor not found.';
    ELSEIF v_doctor_active = 0 THEN
        ROLLBACK;
        SET p_message = 'This doctor is not accepting appointments.';
    ELSEIF p_date < CURDATE() OR (p_date = CURDATE() AND p_time <= CURTIME()) THEN
        ROLLBACK;
        SET p_message = 'Choose a future appointment time.';
    ELSE
        SELECT schedule_id, slot_duration_minutes
        INTO v_schedule_id, v_duration
        FROM doctor_schedule
        WHERE doctor_id = p_doctor_id
          AND day_of_week = WEEKDAY(p_date)
          AND is_active = 1
          AND p_time >= start_time
          AND ADDTIME(p_time, SEC_TO_TIME(slot_duration_minutes * 60)) <= end_time
          AND MOD(TIME_TO_SEC(p_time) - TIME_TO_SEC(start_time), slot_duration_minutes * 60) = 0
        ORDER BY start_time
        LIMIT 1;

        IF v_schedule_id IS NULL THEN
            ROLLBACK;
            SET p_message = 'This doctor has no clinic hours for the selected time.';
        ELSE
            SELECT COUNT(*)
            INTO v_time_off_count
            FROM doctor_time_off
            WHERE doctor_id = p_doctor_id
              AND start_datetime < TIMESTAMP(p_date, ADDTIME(p_time, SEC_TO_TIME(v_duration * 60)))
              AND end_datetime > TIMESTAMP(p_date, p_time);

            IF v_time_off_count > 0 THEN
                ROLLBACK;
                SET p_message = 'The doctor is unavailable at this time.';
            ELSE
                SELECT COUNT(*)
                INTO v_conflict_count
                FROM appointment
                WHERE doctor_id = p_doctor_id
                  AND appointment_date = p_date
                  AND appointment_time >= p_time
                  AND appointment_time < ADDTIME(p_time, SEC_TO_TIME(v_duration * 60))
                  AND status IN ('Booked', 'Confirmed', 'Checked In', 'In Consultation', 'Completed');

                IF v_conflict_count > 0 THEN
                    ROLLBACK;
                    SET p_message = 'This slot is no longer available. Please choose another time.';
                ELSE
                    INSERT INTO appointment
                        (patient_id, doctor_id, appointment_date, appointment_time,
                         status, reason_for_visit, created_at, updated_at)
                    VALUES
                        (p_patient_id, p_doctor_id, p_date, p_time,
                         'Booked', p_reason, UTC_TIMESTAMP(), UTC_TIMESTAMP());

                    SET p_appointment_id = LAST_INSERT_ID();
                    SET p_message = 'Booked';
                    COMMIT;
                END IF;
            END IF;
        END IF;
    END IF;
END
"""


def install_database_objects():
    """Create the trigger and stored procedure used by the application."""
    db.session.execute(text(DROP_TRIGGER_SQL))
    db.session.execute(text(CREATE_TRIGGER_SQL))
    db.session.execute(text(DROP_PROCEDURE_SQL))
    db.session.execute(text(CREATE_PROCEDURE_SQL))
    db.session.commit()


def remove_database_objects():
    db.session.execute(text(DROP_TRIGGER_SQL))
    db.session.execute(text(DROP_PROCEDURE_SQL))
    db.session.commit()
