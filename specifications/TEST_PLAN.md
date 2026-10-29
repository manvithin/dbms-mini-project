# Test Plan and Quality Gate

## Backend tests
Test registration, login, logout, and current user lookup. Verify passwords are hashed and never returned.

Test that patients cannot view another patient's appointments or records. Test that doctors cannot access appointments assigned to other doctors. Test administrator permissions.

Test availability for a valid slot, a past slot, blocked time, inactive doctor, and occupied slot. Test repeated or concurrent booking attempts and verify only one active booking can claim a slot.

Test allowed and rejected status changes. Test test order creation, result creation, diagnosis without tests, prescription after diagnosis, and invalid relationships. Test pagination, validation errors, and safe server errors.

## Frontend tests
Test registration and login validation, loading and empty states, request progress, booking conflict feedback, live dashboard data, working buttons, responsive navigation, keyboard focus, and print layout.

## Manual acceptance walkthrough
1. Start the app using the setup guide.
2. Sign in with a synthetic patient account.
3. View doctors and available slots.
4. Book an appointment.
5. Confirm it appears in the patient dashboard.
6. Sign in as the assigned doctor.
7. Update appointment status.
8. Complete a consultation without a test.
9. Record diagnosis and prescription.
10. Confirm the patient can view those records.
11. Repeat with a test order and result.
12. Attempt to open another patient's record and confirm access is denied.
13. Attempt to book the same slot twice and confirm the second booking is rejected.
14. Print a prescription and check readability.
15. Run automated tests and record actual results.

## Quality gate
Do not call the project complete if clean setup fails, core workflows fail, access control is broken, conflicting bookings can be saved, or tests fail. Report untested behaviour as unverified. Do not claim zero bugs.
