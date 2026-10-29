# Database Explanation

This document explains the MySQL schema used by the General Hospital Outpatient Management System. It is written for a student who needs to defend the design in a viva.

## 1. Database and engine

* Database name in this workspace: `hospital_outpatient`
* Test database: `hospital_outpatient_test`
* Engine: InnoDB
* Character set: utf8mb4
* Time zone for hospital logic: `Asia/Kolkata`
* Application timestamps: stored in UTC where the column represents an event time

The database contains twelve tables. Two schema migrations create the tables, the audit trigger, and the booking stored procedure.

## 2. Table summary

| Number | Table | Main purpose |
| --- | --- | --- |
| 1 | `patient` | Patient demographic and medical summary |
| 2 | `department` | Clinical department |
| 3 | `doctor` | Doctor profile and department |
| 4 | `user_account` | Sign in identity, password hash, role, and role link |
| 5 | `doctor_schedule` | Weekly clinic hours and slot length |
| 6 | `doctor_time_off` | Blocked periods for a doctor |
| 7 | `appointment` | Booking, status, reason, and timestamps |
| 8 | `test_order` | Optional diagnostic test |
| 9 | `test_result` | Result for one test order |
| 10 | `diagnosis` | One diagnosis for an appointment |
| 11 | `prescription` | Treatment plan for one diagnosis |
| 12 | `appointment_status_history` | Status audit written by the trigger |

## 3. Table details

### 3.1 patient

| Column | Type | Rules |
| --- | --- | --- |
| `patient_id` | INT | Primary key, auto increment |
| `name` | VARCHAR(120) | Required |
| `date_of_birth` | DATE | Required, not in the future, realistic age |
| `gender` | VARCHAR(20) | Required, allowed values only |
| `phone` | VARCHAR(20) | Required |
| `address` | VARCHAR(255) | Optional |
| `blood_group` | VARCHAR(20) | Required, allowed values only, default `Unknown` |
| `medical_history` | TEXT | Optional summary |

Check constraints:

```sql
gender IN ('Female', 'Male', 'Other', 'Prefer not to say')
blood_group IN ('A positive', 'A negative', 'B positive', 'B negative',
                'AB positive', 'AB negative', 'O positive', 'O negative', 'Unknown')
```

The patient table does not store a password. Sign in data lives in `user_account` so that authentication concerns stay separate from clinical demographics.

### 3.2 department

| Column | Type | Rules |
| --- | --- | --- |
| `department_id` | INT | Primary key, auto increment |
| `department_name` | VARCHAR(100) | Required, unique |
| `description` | TEXT | Optional |

The unique constraint `uq_department_name` prevents duplicate department names.

### 3.3 doctor

| Column | Type | Rules |
| --- | --- | --- |
| `doctor_id` | INT | Primary key, auto increment |
| `name` | VARCHAR(120) | Required |
| `specialization` | VARCHAR(120) | Required |
| `phone` | VARCHAR(20) | Required |
| `department_id` | INT | Required, foreign key to `department` |
| `is_active` | BOOLEAN | Required, default true |

Foreign key: `department_id` references `department.department_id` with `ON DELETE RESTRICT`. A department that still has doctors cannot be deleted by accident.

Indexes: `ix_doctor_department` and `ix_doctor_active`.

### 3.4 user_account

| Column | Type | Rules |
| --- | --- | --- |
| `user_id` | INT | Primary key, auto increment |
| `username` | VARCHAR(190) | Required, unique, stores the email |
| `password_hash` | VARCHAR(255) | Required |
| `role` | VARCHAR(20) | Required, `patient`, `doctor`, or `admin` |
| `patient_id` | INT | Optional, unique, foreign key to `patient` |
| `doctor_id` | INT | Optional, unique, foreign key to `doctor` |
| `is_active` | BOOLEAN | Required, default true |
| `created_at` | DATETIME | Required, default UTC now |

The role link check is the most important constraint in this table:

```sql
(role = 'patient' AND patient_id IS NOT NULL AND doctor_id IS NULL) OR
(role = 'doctor'  AND doctor_id  IS NOT NULL AND patient_id IS NULL) OR
(role = 'admin'   AND patient_id IS NULL     AND doctor_id  IS NULL)
```

This prevents a doctor account from pointing at a patient row or an administrator account from owning clinical data. The unique constraints on `patient_id` and `doctor_id` enforce a one to one link.

`patient_id` and `doctor_id` use `ON DELETE CASCADE`, so deleting the linked clinical profile also removes its sign in account.

### 3.5 doctor_schedule

| Column | Type | Rules |
| --- | --- | --- |
| `schedule_id` | INT | Primary key, auto increment |
| `doctor_id` | INT | Required, foreign key to `doctor`, cascade on delete |
| `day_of_week` | SMALLINT | Required, 0 Monday through 6 Sunday |
| `start_time` | TIME | Required |
| `end_time` | TIME | Required, later than start |
| `slot_duration_minutes` | SMALLINT | Required, 5 to 240, default 30 |
| `is_active` | BOOLEAN | Required, default true |

Index: `ix_schedule_doctor_day` on doctor and day.

The application uses Python weekday numbers, where Monday is 0. MySQL `WEEKDAY()` uses the same numbering, which keeps the stored procedure and the Python availability code consistent.

### 3.6 doctor_time_off

| Column | Type | Rules |
| --- | --- | --- |
| `time_off_id` | INT | Primary key, auto increment |
| `doctor_id` | INT | Required, foreign key to `doctor`, cascade on delete |
| `start_datetime` | DATETIME | Required |
| `end_datetime` | DATETIME | Required, later than start |
| `reason` | VARCHAR(255) | Optional |

Index: `ix_time_off_doctor_start` on doctor and start time.

Overlap rule: a time off entry blocks a slot when `start_datetime < slot_end` and `end_datetime > slot_start`. This is the standard half open interval test.

### 3.7 appointment

| Column | Type | Rules |
| --- | --- | --- |
| `appointment_id` | INT | Primary key, auto increment |
| `patient_id` | INT | Required, foreign key to `patient`, restrict on delete |
| `doctor_id` | INT | Required, foreign key to `doctor`, restrict on delete |
| `appointment_date` | DATE | Required |
| `appointment_time` | TIME | Required |
| `status` | VARCHAR(20) | Required, default `Booked`, allowed values only |
| `reason_for_visit` | TEXT | Required |
| `created_at` | DATETIME | Required, default UTC now |
| `updated_at` | DATETIME | Required, updated by the application and trigger |
| `slot_active` | SMALLINT generated | 1 for active statuses, `NULL` otherwise |

Allowed statuses:

```text
Booked, Confirmed, Checked In, In Consultation, Completed, Cancelled, No Show
```

#### The generated column and the double booking rule

`slot_active` is a stored generated column:

```sql
CASE WHEN status IN ('Booked', 'Confirmed', 'Checked In',
                     'In Consultation', 'Completed')
     THEN 1 ELSE NULL END
```

The unique constraint is:

```sql
UNIQUE (doctor_id, appointment_date, appointment_time, slot_active)
```

MySQL unique indexes allow multiple `NULL` values. Therefore:

* Two active appointments for the same doctor, date, and time both have `slot_active = 1`, so the second insert fails.
* Any number of cancelled or no show rows for that slot have `slot_active = NULL`, so history is preserved.
* After a cancellation, the slot can be booked again.

This is a database level guarantee. It works even if application code has a bug.

Indexes: `ix_appointment_doctor_date`, `ix_appointment_patient_date`, and `ix_appointment_status`.

### 3.8 test_order

| Column | Type | Rules |
| --- | --- | --- |
| `test_id` | INT | Primary key, auto increment |
| `appointment_id` | INT | Required, foreign key to `appointment`, cascade on delete |
| `test_type` | VARCHAR(120) | Required |
| `order_date` | DATETIME | Required, default UTC now |
| `status` | VARCHAR(20) | Required, `Ordered`, `Completed`, or `Cancelled` |
| `notes` | TEXT | Optional |

Index: `ix_test_order_appointment`.

A test is optional. An appointment may have zero test orders. A result is stored separately because the result may arrive later.

### 3.9 test_result

| Column | Type | Rules |
| --- | --- | --- |
| `result_id` | INT | Primary key, auto increment |
| `test_id` | INT | Required, unique, foreign key to `test_order`, cascade on delete |
| `result_date` | DATETIME | Required, default UTC now |
| `result_summary` | TEXT | Required |
| `remarks` | TEXT | Optional |

The unique constraint `uq_test_result_test` enforces one result per test order. When a result is recorded, the application also changes the test order status to `Completed`.

A result is evidence. It does not create a diagnosis. The doctor writes the diagnosis separately.

### 3.10 diagnosis

| Column | Type | Rules |
| --- | --- | --- |
| `diagnosis_id` | INT | Primary key, auto increment |
| `appointment_id` | INT | Required, unique, foreign key to `appointment`, cascade on delete |
| `diagnosis_description` | TEXT | Required |
| `diagnosis_date` | DATETIME | Required, default UTC now |
| `notes` | TEXT | Optional |

The unique constraint `uq_diagnosis_appointment` allows at most one diagnosis per appointment. This keeps the demonstration simple.

### 3.11 prescription

| Column | Type | Rules |
| --- | --- | --- |
| `prescription_id` | INT | Primary key, auto increment |
| `diagnosis_id` | INT | Required, unique, foreign key to `diagnosis`, cascade on delete |
| `treatment_plan` | TEXT | Required |
| `instructions` | TEXT | Required |
| `follow_up_date` | DATE | Optional, cannot be in the past |

The unique constraint `uq_prescription_diagnosis` allows one prescription per diagnosis.

Medication and treatment details are stored as text inside `treatment_plan` and `instructions`. The project deliberately does not include Medicine or Prescription_Medicine tables, as required by the project brief.

### 3.12 appointment_status_history

| Column | Type | Rules |
| --- | --- | --- |
| `history_id` | INT | Primary key, auto increment |
| `appointment_id` | INT | Required, foreign key to `appointment`, cascade on delete |
| `old_status` | VARCHAR(20) | Required |
| `new_status` | VARCHAR(20) | Required |
| `changed_at` | DATETIME | Required, default UTC now |

Index: `ix_status_history_appointment` on appointment and changed time.

Rows are written by the trigger, not by application code. This gives one consistent audit path for patient, doctor, and administrator status changes.

## 4. Relationships

| Parent | Child | Cardinality | Delete rule |
| --- | --- | --- | --- |
| `department` | `doctor` | One to many | Restrict |
| `patient` | `user_account` | One to zero or one | Cascade |
| `doctor` | `user_account` | One to zero or one | Cascade |
| `doctor` | `doctor_schedule` | One to many | Cascade |
| `doctor` | `doctor_time_off` | One to many | Cascade |
| `patient` | `appointment` | One to many | Restrict |
| `doctor` | `appointment` | One to many | Restrict |
| `appointment` | `test_order` | One to many | Cascade |
| `appointment` | `diagnosis` | One to zero or one | Cascade |
| `appointment` | `appointment_status_history` | One to many | Cascade |
| `test_order` | `test_result` | One to zero or one | Cascade |
| `diagnosis` | `prescription` | One to zero or one | Cascade |

`RESTRICT` on appointments protects clinical history. A patient or doctor with appointments cannot be deleted without dealing with those appointments first. `CASCADE` is used where the child record has no meaning without the parent, such as a test result without a test order.

## 5. Normalisation

### First normal form

Every column stores one value. There are no repeating groups. Multiple tests are separate `test_order` rows rather than a list inside the appointment.

### Second normal form

Every table has a single column primary key. All non key columns depend on the whole key. There are no composite keys with partial dependencies.

### Third normal form

There are no transitive dependencies:

* Department details are stored once in `department`, not repeated in every doctor row.
* Doctor details are stored once in `doctor`, not repeated in every appointment.
* Patient details are stored once in `patient`, not repeated in every appointment.
* Account data is separate from clinical data.

The `slot_active` column is derived, but it is a MySQL generated column. It is not manually maintained duplicate data. Its purpose is to support the unique active slot constraint.

The text fields for medication are an intentional simplification required by the brief. A full pharmacy design would add medicine and prescription line tables, but that is outside this project.

## 6. Indexes

| Index | Table | Columns | Reason |
| --- | --- | --- | --- |
| Primary key | All tables | Identifier | Row lookup |
| `uq_department_name` | `department` | `department_name` | Prevent duplicates |
| `uq_user_account_username` | `user_account` | `username` | Sign in lookup and uniqueness |
| `uq_user_account_patient` | `user_account` | `patient_id` | One account per patient |
| `uq_user_account_doctor` | `user_account` | `doctor_id` | One account per doctor |
| `ix_doctor_department` | `doctor` | `department_id` | Department doctor lists |
| `ix_doctor_active` | `doctor` | `is_active` | Public directory filter |
| `ix_schedule_doctor_day` | `doctor_schedule` | `doctor_id`, `day_of_week` | Availability lookup |
| `ix_time_off_doctor_start` | `doctor_time_off` | `doctor_id`, `start_datetime` | Time off lookup |
| `uq_doctor_active_slot` | `appointment` | doctor, date, time, `slot_active` | Prevent double booking |
| `ix_appointment_doctor_date` | `appointment` | doctor, date, time | Daily doctor list |
| `ix_appointment_patient_date` | `appointment` | patient, date | Patient history |
| `ix_appointment_status` | `appointment` | `status` | Status filters |
| `ix_test_order_appointment` | `test_order` | `appointment_id` | Tests for a visit |
| `uq_test_result_test` | `test_result` | `test_id` | One result per test |
| `uq_diagnosis_appointment` | `diagnosis` | `appointment_id` | One diagnosis per visit |
| `uq_prescription_diagnosis` | `prescription` | `diagnosis_id` | One prescription per diagnosis |
| `ix_status_history_appointment` | `appointment_status_history` | appointment, changed time | Timeline display |

## 7. The audit trigger

The trigger is named `trg_appointment_status_audit`.

```sql
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
```

### Why BEFORE UPDATE

A `BEFORE UPDATE` trigger can change `NEW.updated_at` before the row is written. It can also compare `OLD.status` and `NEW.status` directly.

### What it guarantees

* Every status change has an audit row, whether the change came from a doctor route, a patient cancellation, or an administrator cancellation.
* `updated_at` is refreshed by the database, not only by application code.
* The history row is written in the same transaction as the appointment update. If the update rolls back, the history row rolls back too.

The trigger does not fire on insert, so the first `Booked` state has no history row. The demonstration seed inserts history rows explicitly for past appointments to show a realistic timeline.

## 8. The booking stored procedure

The procedure is named `sp_book_appointment`.

### Parameters

| Parameter | Direction | Meaning |
| --- | --- | --- |
| `p_patient_id` | IN | Patient identifier |
| `p_doctor_id` | IN | Doctor identifier |
| `p_date` | IN | Appointment date |
| `p_time` | IN | Appointment start time |
| `p_reason` | IN | Reason for visit |
| `p_appointment_id` | OUT | New identifier or `NULL` |
| `p_message` | OUT | Result message |

### Step by step

1. Declare local variables and an exception handler.
2. Start a transaction.
3. Select the doctor row with `FOR UPDATE`. This lock serialises booking attempts for the same doctor.
4. Reject a missing doctor or an inactive doctor.
5. Reject a date and time that is not in the future.
6. Find a schedule row where:
   * the weekday matches `WEEKDAY(p_date)`,
   * the schedule is active,
   * the requested time is inside the schedule,
   * the slot ends before the schedule ends,
   * the time is aligned to the slot grid.
7. Reject the request if no schedule matches.
8. Count overlapping time off entries. Reject if any exist.
9. Count overlapping active appointments. Reject if any exist.
10. Insert the appointment with status `Booked`.
11. Return the new identifier and the message `Booked`.
12. Commit.
13. On any SQL exception, roll back, clear the identifier, set a safe message, and re raise.

### Slot alignment expression

```sql
MOD(TIME_TO_SEC(p_time) - TIME_TO_SEC(start_time), slot_duration_minutes * 60) = 0
```

This ensures a requested time is an exact multiple of the slot length from the schedule start. For example, with a 09:00 start and 30 minute slots, 09:30 is valid and 09:45 is not.

### Overlap expression

```sql
appointment_time >= p_time
AND appointment_time < ADDTIME(p_time, SEC_TO_TIME(v_duration * 60))
```

This checks whether an existing appointment starts inside the new slot. Because both sides use the same slot grid, this is sufficient for the demonstration.

### Why use a procedure

The procedure keeps the critical booking checks close to the data and inside one transaction. It demonstrates stored program logic, variables, `IF` statements, `SELECT ... INTO`, `FOR UPDATE`, `START TRANSACTION`, `COMMIT`, `ROLLBACK`, and an exception handler. The Flask route stays small and translates the output message into an HTTP response.

## 9. Transaction and concurrency behaviour

The important race is two patients trying to book the same doctor, date, and time at the same moment.

Without protection:

1. Request A checks the slot and sees it free.
2. Request B checks the slot and sees it free.
3. Both insert, and the clinic is double booked.

With the procedure:

1. Request A locks the doctor row.
2. Request B waits on the same doctor row.
3. Request A checks, inserts, and commits.
4. Request B obtains the lock, checks again, sees the active appointment, and returns a conflict message.

The unique constraint on `doctor_id`, `appointment_date`, `appointment_time`, and `slot_active` is a second safeguard. If the procedure logic were bypassed, the database would still reject a duplicate active slot.

The test suite includes a concurrent booking test that starts two threads against the same slot and verifies that only one appointment row exists.

## 10. Status rules

Doctor transitions:

| Current status | Allowed next statuses |
| --- | --- |
| Booked | Confirmed, Checked In, Cancelled, No Show |
| Confirmed | Checked In, Cancelled, No Show |
| Checked In | In Consultation, Cancelled |
| In Consultation | Completed |
| Completed | None |
| Cancelled | None |
| No Show | None |

Clinical records can be written when the appointment is `Checked In`, `In Consultation`, or `Completed`. The completed state is included so a doctor can add a late test result or correct the record after the visit.

Patient cancellation rules:

* Status must be `Booked` or `Confirmed`.
* The appointment must start at least two hours in the future.

Administrator cancellation rules:

* Status must be `Booked`, `Confirmed`, or `Checked In`.

Cancellation releases the slot because `slot_active` becomes `NULL`.

## 11. Sample queries used by the application

### Active doctor count per department

```sql
SELECT d.department_id,
       d.department_name,
       d.description,
       COUNT(doc.doctor_id) AS doctor_count
FROM department AS d
LEFT JOIN doctor AS doc
       ON doc.department_id = d.department_id
      AND doc.is_active = 1
GROUP BY d.department_id, d.department_name, d.description
ORDER BY d.department_name;
```

This is a left join with an aggregate. Departments with no active doctors still appear with a count of zero.

### Doctor directory search

```sql
SELECT doc.*, dep.department_name
FROM doctor AS doc
JOIN department AS dep ON dep.department_id = doc.department_id
WHERE doc.is_active = 1
  AND (doc.name LIKE %s OR doc.specialization LIKE %s OR dep.department_name LIKE %s)
ORDER BY doc.name;
```

The application uses SQLAlchemy `ilike` so the search is case insensitive on MySQL.

### Appointments for one doctor on one date

```sql
SELECT a.*, p.name AS patient_name
FROM appointment AS a
JOIN patient AS p ON p.patient_id = a.patient_id
WHERE a.doctor_id = %s
  AND a.appointment_date = %s
ORDER BY a.appointment_time;
```

### Patient clinical history

```sql
SELECT a.appointment_id,
       a.appointment_date,
       a.status,
       doc.name AS doctor_name,
       dep.department_name,
       diag.diagnosis_description,
       pr.treatment_plan,
       pr.instructions,
       pr.follow_up_date
FROM appointment AS a
JOIN doctor AS doc ON doc.doctor_id = a.doctor_id
JOIN department AS dep ON dep.department_id = doc.department_id
LEFT JOIN diagnosis AS diag ON diag.appointment_id = a.appointment_id
LEFT JOIN prescription AS pr ON pr.diagnosis_id = diag.diagnosis_id
WHERE a.patient_id = %s
ORDER BY a.appointment_date DESC, a.appointment_time DESC;
```

The left joins are important because a visit may not have a diagnosis or prescription yet.

### Appointment count by status

```sql
SELECT status, COUNT(*) AS total
FROM appointment
GROUP BY status
ORDER BY total DESC;
```

### Pending test work for a doctor

```sql
SELECT t.test_id, t.test_type, t.order_date, p.name AS patient_name
FROM test_order AS t
JOIN appointment AS a ON a.appointment_id = t.appointment_id
JOIN patient AS p ON p.patient_id = a.patient_id
WHERE a.doctor_id = %s
  AND t.status = 'Ordered'
ORDER BY t.order_date;
```

### Status audit for one appointment

```sql
SELECT old_status, new_status, changed_at
FROM appointment_status_history
WHERE appointment_id = %s
ORDER BY changed_at, history_id;
```

## 12. Seed data

The reset command loads:

| Data | Count |
| --- | --- |
| Departments | 6 |
| Doctors | 6 |
| Patients | 4 |
| User accounts | 11 |
| Schedule rows | 19 |
| Appointments | 10 |
| Test orders | 2 |
| Prescriptions | 3 |

The seed creates past, today, and future appointments with a mixture of statuses. It also creates realistic status history, a completed visit with a diagnosis and prescription, and a visit with an ordered test that has no result yet.

All names, phone numbers, addresses, and clinical notes are synthetic.

## 13. Common viva points

**Why is `slot_active` generated instead of a normal column?**
Because it must always match the status. A generated column cannot drift out of sync. MySQL maintains it automatically.

**Why does a unique index allow several cancelled rows for one slot?**
Because `slot_active` is `NULL` for cancelled rows, and MySQL unique indexes permit multiple `NULL` values.

**Why keep test result in a separate table?**
The result is optional and arrives later. A separate table avoids many empty columns and enforces one result per test order.

**Why is diagnosis separate from appointment?**
The appointment stores scheduling and status. The diagnosis stores clinical judgement and has its own date and notes. Separating them keeps each table focused.

**Why is prescription linked to diagnosis rather than appointment?**
A prescription follows a diagnosis. Linking it to the diagnosis makes the clinical dependency explicit.

**Why use both application checks and database constraints?**
Application checks produce friendly messages. Database constraints protect integrity even if a future route forgets a check. They serve different purposes.

**Why use a stored procedure for booking?**
It keeps the multi step check and insert inside one transaction with row locking. It also demonstrates database programming concepts required by the project.

**Why is the trigger `BEFORE UPDATE`?**
It needs to modify `NEW.updated_at` and compare old and new status before the row is written.

**What happens if a doctor is deactivated?**
The public directory excludes the doctor. New bookings are rejected by the procedure. Existing appointments remain because appointments use `RESTRICT` on doctor deletion.

**What happens if a department has doctors?**
The foreign key uses `RESTRICT`, so the department cannot be deleted until its doctors are moved or removed.
