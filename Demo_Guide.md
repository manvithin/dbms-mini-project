# Demo Guide

This guide explains how to start the project and demonstrate it in about ten minutes. It assumes the setup in [README.md](README.md) is complete.

## 1. Before the demonstration

### 1.1 Start MySQL

Make sure the MySQL server used by the project is running. In this workspace it listens on port 3307. A standard local install usually uses 3306.

Check the connection:

```powershell
mysql --version
```

### 1.2 Reset the demonstration data

From `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe reset-demo
```

Expected output includes:

```text
departments: 6
doctors: 6
patients: 4
appointments: 10
```

The reset deletes the demonstration rows, including the administrator account and the setup marker, restarts identifiers from 1, and reloads the data. Run it before the viva so the dates are current, then run `setup-admin` again. This command is for the local synthetic demonstration only.

### 1.3 Start the backend

From `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\python.exe run.py
```

Keep this terminal open. The API listens on `http://127.0.0.1:5000`.

### 1.4 Start the frontend

From `frontend`:

```powershell
npm run dev
```

Keep this terminal open. Open `http://localhost:5173`.

### 1.5 Open the demonstration accounts

| Role | Email | Password |
| --- | --- | --- |
| Doctor | `meera.iyer@example.com` | `Doctor@123` |
| Patient | `riya.kapoor@example.com` | `Patient@123` |

The sign in page has quick fill buttons for the synthetic patient and doctor accounts. It does not have an administrator demo button.

The administrator account is created locally with `flask setup-admin`. The generated password is printed once and must be stored in a password manager, not in this guide.

### 1.6 Creating the administrator or a doctor

Public registration creates patients only.

If no administrator exists, create the first one from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe setup-admin --email admin@example.com --generate-password
```

The command asks for `ADMIN_SETUP_SECRET`. It hashes the password with PBKDF2 SHA256 and 600,000 iterations and prints the generated password once. The setup marker then closes first time setup permanently.

If an administrator already exists, rotate the credentials in place:

```powershell
..\.venv\Scripts\flask.exe setup-admin --rotate --email admin@example.com --generate-password
```

The command asks for the current password. It updates the existing account and preserves all clinical data.

To create a doctor, sign in as an administrator, open **Doctors**, click **Add doctor**, fill the doctor details, login email, and temporary password, then click **Create doctor**. The doctor account is created with the doctor record.

## 2. Ten minute demonstration script

### Minute 0 to 2: Public experience

1. Open `http://localhost:5173`.
2. Point out the hero section, health artwork, department cards, and featured doctor portraits.
3. Scroll to the department section. Explain that the doctor count comes from a left join and aggregate query.
4. Click a department or a featured doctor.
5. On the doctor detail page, show:
   * Clinic hours.
   * Open slots for the selected date.
   * The note that booking requires a patient sign in.
6. Change the date to another clinic day and show that availability is recalculated.

Talking point: availability is not a static list. It is generated from schedule rows, time off, active appointments, and the current time.

### Minute 2 to 4: Patient booking

1. Sign in with the patient account.
2. Show the patient overview: next appointment, recent visits, and quick actions.
3. Click **Book appointment**.
4. Choose a department and doctor.
5. Choose a date with open slots.
6. Select a slot and enter a reason such as `Persistent cough for three days.`
7. Submit.
8. Show the success message and the appointment detail page.
9. Return to **My appointments** and show the new visit.
10. Open **My records** and show the completed visit that has a diagnosis, prescription, and test result.
11. Open the print view and show the clean print layout.

Optional: cancel the new appointment and show that the slot returns to availability.

Talking point: the server checks availability again before booking. If another patient takes the slot first, the request returns a conflict message. The database also has a unique active slot rule.

### Minute 4 to 7: Doctor consultation

1. Sign out and sign in with the doctor account.
2. Show the doctor dashboard:
   * Today total.
   * Waiting count.
   * In consultation count.
   * Completed count.
   * Upcoming visits.
   * Pending tests.
3. Open the checked in appointment for Arjun Mehta at 9:00.
4. Show the patient context and the status timeline.
5. Move the status from **Checked In** to **In Consultation**.
6. Order a test, for example `Complete blood count`.
7. Record a result for the test.
8. Record a diagnosis, for example `Viral upper respiratory infection`.
9. Record a prescription with a treatment plan, instructions, and a follow up date.
10. Move the appointment to **Completed**.
11. Show that the completed record is now readable and printable.

Talking point: tests are optional. The doctor can record a diagnosis and prescription without ordering any test. A test result is evidence, not a diagnosis.

Talking point: clinical forms are disabled until the patient is checked in. The backend enforces this even if someone calls the API directly.

### Minute 7 to 9: Administrator

1. Sign out and sign in with the administrator account.
2. Show the dashboard metrics and colour cards.
3. Open **Doctors** and show the doctor list.
4. Edit a doctor phone number or specialization, then save.
5. Open **Departments** and create a department, for example `Physiotherapy`.
6. Show that a duplicate department name is rejected.
7. Open **Schedules** and show weekly clinic hours.
8. Try to create an overlapping schedule and show the validation message.
9. Open **Time off** and show a blocked period.
10. Open **Appointments** and demonstrate search by patient name and the status filter.
11. Cancel an eligible appointment and show that the slot is released.
12. Open **Security** and show the email and password forms. Point out that the current password is required and that a password change ends every session.
13. Sign out and show that the protected page returns to sign in.

Talking point: doctors are hospital users, but their permissions are narrower than the administrator. Doctors can only see their assigned appointments. Administrators manage hospital data but do not write clinical records. The backend enforces every role check even if the frontend is bypassed.

### Minute 9 to 10: Database evidence

Open a terminal and run, from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe check-db
```

Show:

* Table counts.
* Audit trigger present.
* Booking procedure present.

Then run:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

Show the passing backend suite. The current result is 69 passed. If time is short, show the recorded result in [Test_Report.md](Test_Report.md).

Point out the security tests in `backend/tests/test_security.py`. They prove that a signed out user gets `401` on a doctor update, a patient and a doctor get `403` on administrator endpoints, a doctor cannot update another doctor, an administrator can update a doctor, a role change in a request body is rejected, first time setup requires the secret and closes permanently, and a password change ends the old session and the old password.

## 3. What to emphasise in the viva

| Topic | Point to show |
| --- | --- |
| Relational design | Thirteen tables with primary and foreign keys |
| Normalisation | Department, doctor, patient, and account data stored once |
| Constraints | Unique username, unique department name, check constraints, role link check |
| Generated column | `slot_active` derives from status |
| Unique active slot | Allows a cancelled slot to be rebooked while blocking duplicates |
| Trigger | Every status change writes history |
| Stored procedure | Booking checks and insert happen in one transaction with row locking |
| Concurrency | Two simultaneous bookings produce one appointment |
| Optional tests | Diagnosis and prescription work without a test |
| Security | Password hashing, first time setup secret, CSRF, secure session cookie, backend role checks, record ownership, credential rotation |
| Print views | Same data, dedicated layout |

## 4. Suggested questions to ask yourself while practising

* Why is `slot_active` a generated column?
* Why can several cancelled rows share the same doctor, date, and time?
* Why does the procedure lock the doctor row?
* Why is the test result in a separate table?
* Why is the prescription linked to the diagnosis?
* What happens when a doctor is deactivated?
* How does the backend prevent a patient from reading another patient record?
* Why is the trigger `BEFORE UPDATE`?
* Which normal form is the schema in, and why?
* What would you change if the hospital had multiple branches?

## 5. Recovery steps

### The demonstration data looks wrong

Run the reset command again:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe reset-demo
```

Then refresh the browser.

### No slots appear

Possible reasons:

* The selected date is not a clinic day for that doctor.
* The date is in the past.
* The remaining slots have already started.
* The doctor is on time off.
* All slots are booked.

Choose another date or reset the demo data.

### Sign in fails

Check that the backend is running and that the database was seeded. The synthetic doctor and patient accounts are printed by `reset-demo`. The administrator account is not printed because it is created with `setup-admin`.

If the administrator password is lost, rotate it from a trusted terminal with the current password. If the current password is also lost, restore the database from a backup or use a controlled local recovery procedure. Do not add a public reset endpoint.

### The page shows a network error

Check both terminals. The frontend expects the backend on port 5000. The backend expects MySQL on the configured port.

### The browser shows a 401 on a public page

A public page asks `/api/auth/me` to check whether a visitor is signed in. A 401 is expected for a signed out visitor. The page should still render normally.

### A booking returns a conflict

The slot was taken between page load and submit. Refresh availability and choose another slot. This is the intended behaviour.

### The doctor cannot add clinical records

The appointment must be `Checked In`, `In Consultation`, or `Completed`. Move the status first.

### Port 5000 or 5173 is already in use

Stop the other process or change the port. If you change the backend port, update the Vite proxy in `frontend/vite.config.ts`.

## 6. Stop the application

Press `Ctrl+C` in the frontend terminal and in the backend terminal. MySQL can keep running.

## 7. Clean demonstration checklist

* [ ] MySQL is running.
* [ ] Demo data was reset today, or the existing data is current.
* [ ] The administrator was created or rotated with `setup-admin`.
* [ ] Backend is running on port 5000.
* [ ] Frontend is running on port 5173.
* [ ] Browser is open at `http://localhost:5173`.
* [ ] Synthetic doctor and patient account details are ready.
* [ ] The administrator password is in the password manager, not in the slide deck.
* [ ] The login page does not show an administrator demo button.
* [ ] Screenshots are available as a backup.
* [ ] Test report is available.
* [ ] The database check command has been rehearsed.
* [ ] The security settings page and sign out have been rehearsed.
