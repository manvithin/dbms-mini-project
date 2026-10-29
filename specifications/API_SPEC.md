# API Specification

## General rules
Use a versioned REST API under /api. Return JSON, validate every request on the server, use appropriate status codes, and never return password hashes or stack traces.

A consistent error response can include an error code, a safe message, and field level validation details.

## Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

Public registration creates patient accounts only. Doctor and administrator accounts are created through a controlled setup process or administrator action.

## Patient endpoints
GET /api/patients/me
PATCH /api/patients/me
GET /api/patients/me/appointments
GET /api/patients/me/records
GET /api/doctors
GET /api/departments
GET /api/doctors/{doctor_id}/availability?date=YYYY_MM_DD
POST /api/appointments
GET /api/appointments/{appointment_id}
POST /api/appointments/{appointment_id}/cancel

Enforce record ownership in the backend.

## Doctor endpoints
GET /api/doctor/appointments
GET /api/doctor/appointments/{appointment_id}
PATCH /api/doctor/appointments/{appointment_id}/status
POST /api/appointments/{appointment_id}/tests
POST /api/tests/{test_id}/result
POST /api/appointments/{appointment_id}/diagnosis
POST /api/diagnoses/{diagnosis_id}/prescription

Doctors may access only assigned appointments and related records.

## Administrator endpoints
GET /api/admin/summary
GET /api/admin/doctors
POST /api/admin/doctors
PATCH /api/admin/doctors/{doctor_id}
GET /api/admin/departments
POST /api/admin/departments
PATCH /api/admin/departments/{department_id}
GET /api/admin/schedules
POST /api/admin/schedules
PATCH /api/admin/schedules/{schedule_id}
GET /api/admin/appointments

Use pagination for long lists. Never place user supplied SQL fragments into queries.

## Booking rules
Calculate availability from doctor schedules, time off, existing appointments, slot duration, and appointment status. Recheck availability during save because a slot may be booked after it was displayed. Use a transaction and database locking or a defensible unique constraint strategy to prevent two active bookings for the same doctor slot.

Reject past slots, unavailable slots, inactive doctors, invalid dates, and malformed input. Return a clear conflict response if a slot is no longer available.

## Record rules
Accept only permitted status transitions. A test result must reference an existing test order. A diagnosis must reference an existing appointment. A prescription must reference an existing diagnosis. Use transactions for related writes. Do not trust patient identifiers or roles sent by the client to determine access.
