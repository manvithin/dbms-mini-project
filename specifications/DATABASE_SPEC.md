# Database Specification

## Database
Use MySQL 8, InnoDB, and utf8mb4. Create the schema through migrations or a repeatable SQL setup script. Document the application time zone.

## Eight core clinical tables

### Patient
patient_id primary key, name, date_of_birth, gender, phone, address, blood_group, medical_history.

### Department
department_id primary key, department_name unique, description.

### Doctor
doctor_id primary key, name, specialization, phone, department_id foreign key to Department.

### Appointment
appointment_id primary key, patient_id foreign key to Patient, doctor_id foreign key to Doctor, appointment_date, appointment_time, status, reason_for_visit, created_at, updated_at.

Suggested statuses: Booked, Confirmed, Checked In, In Consultation, Completed, Cancelled, No Show.

### Test_Order
test_id primary key, appointment_id foreign key to Appointment, test_type, order_date, status, notes.

### Test_Result
result_id primary key, test_id unique foreign key to Test_Order, result_date, result_summary, remarks. The unique test_id allows at most one result record per test order.

### Diagnosis
diagnosis_id primary key, appointment_id unique foreign key to Appointment, diagnosis_description, diagnosis_date, notes. This simplified model permits at most one diagnosis per appointment.

### Prescription
prescription_id primary key, diagnosis_id unique foreign key to Diagnosis, treatment_plan, instructions, follow_up_date. Store medicine names and usage instructions as text. Do not create Medicine or Prescription_Medicine tables.

## Operational tables

### User_Account
user_id primary key, username or email unique, password_hash, role, patient_id nullable unique foreign key to Patient, doctor_id nullable unique foreign key to Doctor, is_active, created_at.

Patient accounts link to one patient record. Doctor accounts link to one doctor record. Administrator accounts link to neither. Validate the role and account relationship in the backend.

### Doctor_Schedule
schedule_id primary key, doctor_id foreign key to Doctor, day_of_week, start_time, end_time, slot_duration_minutes, is_active.

Use this table to calculate genuine availability. Validate end time and positive slot duration. Prevent overlapping schedule definitions.

### Doctor_Time_Off
Optional table: time_off_id primary key, doctor_id foreign key to Doctor, start_datetime, end_datetime, reason. Validate time ranges.

## Relationships
1. Department has many Doctors.
2. Patient has many Appointments.
3. Doctor has many Appointments.
4. Appointment has zero or many Test_Order records.
5. Test_Order has zero or one Test_Result.
6. Appointment has zero or one Diagnosis.
7. Diagnosis has zero or one Prescription.
8. Patient has zero or one User_Account in this simplified model.
9. Doctor has zero or one User_Account in this simplified model.
10. Doctor has many Doctor_Schedule records.
11. Doctor may have many Doctor_Time_Off records.

## Normalization
First normal form is supported by storing individual values rather than repeating groups. Second normal form is straightforward because each table uses a single column primary key and non key attributes depend on that key. Third normal form is supported by keeping department facts in Department, doctor facts in Doctor, appointment facts in Appointment, and clinical details in their own tables.

Document the simplifications: one diagnosis per appointment, one prescription per diagnosis, and one result per test order.

## Required DBMS demonstrations
Include and explain one useful join query, one aggregate query, one transaction, one trigger, and one stored procedure. Each must have a clear purpose and be tested.
