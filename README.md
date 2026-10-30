# General Hospital Outpatient Management System

A focused undergraduate DBMS mini project for outpatient appointments and consultation records. The system connects patients, doctors, and hospital administrators through one working web application backed by MySQL 8.

The project demonstrates relational design, foreign keys, check constraints, a generated column, a unique active slot rule, joins, aggregate queries, transactions, a stored procedure, an audit trigger, session authentication, role based permissions, and a responsive React interface.

![Public home page](screenshots/01-public-home.png)

## Project status

The application is implemented and verified in this workspace.

| Check | Result |
| --- | --- |
| Backend tests | 69 passed |
| Frontend tests | 31 passed across 9 files |
| Production build | Passed |
| Administrator setup migration | Applied without changing clinical data |
| Database object check | Trigger and procedure present |
| Manual browser acceptance | Completed for the main workflows and security settings |

The exact commands and results are recorded in [Test_Report.md](Test_Report.md). Deployment details are in [Deployment_Guide.md](Deployment_Guide.md).

The live demonstration is split across three free services:

| Part | Service | Address |
| --- | --- | --- |
| Frontend | Vercel | `https://clinic-frontend-nine-gold.vercel.app/` |
| Backend API | Render | `https://dbms-mini-project-ybmr.onrender.com` |
| Database | Aiven MySQL 8.4 | Private Aiven service |

The live frontend now serves the security build. The live setup page reports that setup is already complete, and the login page no longer offers an administrator demo account. The live API includes a compatibility fallback for the missing `system_setting` table, but the Aiven migration should still be applied. The production administrator password has not yet been rotated.

The live administrator account is `admin@cityhospital.example`. The original demonstration password from the seed file was `Admin@123`. To rotate it, run with the production `DATABASE_URL`:

```powershell
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe setup-admin --rotate --email admin@example.com --current-password Admin@123
```

After rotation, the new password must be stored in a password manager and added to Render's environment variable `ADMIN_SETUP_SECRET` (removed after setup is confirmed complete).

## Roles

| Role | Main abilities |
| --- | --- |
| Patient | Register, sign in, browse doctors and facilities, book or cancel appointments, view own appointments and clinical records, update own profile, print records |
| Doctor | View only assigned appointments, move appointments through allowed statuses, order optional tests, record results, diagnosis, prescription, treatment plan, and follow up date |
| Administrator | Manage departments, doctors, schedules, time off, and all appointments, reset doctor passwords, cancel eligible appointments, change the administrator sign in email and password |

Doctors are hospital users with narrower clinical permissions than administrators. The three roles are intentionally kept separate.

## Main workflow

1. A patient registers or signs in.
2. The patient compares departments, doctors, clinic hours, and open slots.
3. The patient books a slot.
4. The server validates the slot inside a transaction and prevents conflicts.
5. The doctor checks the patient in and records clinical work.
6. Diagnostic tests are optional. A diagnosis and prescription can exist without tests.
7. The patient sees the completed record and can print it.

## Interface

The public area uses a top navigation bar. The signed in areas use a left sidebar, and on small screens the menu button sits on the left beside the General Hospital logo. The public home page, sign in page, registration page, and the three role landing pages do not show a back control. Subpages use the shared page header button on signed in pages, the public layout button on public subpages, or a contextual link back to their parent list. The print layout provides its own back button.

The booking form shows examples for the selected doctor specialty. If the reason clearly belongs to another department, the form explains the mismatch and the server rejects the booking. For example, an acne concern is guided to Dermatology instead of Ear Nose and Throat.

Dashboard count cards are data driven. Each card shows the total, a short list of real patient or visit records, and a link to the matching filtered list or appointment record. Empty cards explain that no matching records exist.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Python 3, Flask, Flask SQLAlchemy, Flask Migrate, Flask CORS |
| Database | MySQL 8 with InnoDB and utf8mb4 |
| Tests | Pytest, Vitest, React Testing Library |

## Repository layout

```text
dbms project/
  backend/          Flask API, models, services, migrations, tests
  frontend/         React application, components, pages, tests
  screenshots/      Final acceptance screenshots
  specifications/   Original project specifications
  README.md         This project index
  Project_Report.md
  Database_Explanation.md
  Code_Walkthrough.md
  Test_Report.md
  Demo_Guide.md
  Viva_Preparation.md
  Project_Summary.md
  Deployment_Guide.md
```

## Local setup

### 1. Requirements

Install MySQL 8, Python 3.11 or newer, and Node.js 20 or newer.

Check the tools:

```powershell
mysql --version
python --version
node --version
npm --version
```

### 2. Create the databases

Sign in to MySQL as an administrator and run:

```sql
CREATE DATABASE hospital_outpatient CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE hospital_outpatient_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hospital_app'@'127.0.0.1' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON hospital_outpatient.* TO 'hospital_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON hospital_outpatient_test.* TO 'hospital_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Use a strong local password. Do not commit the real `.env` file.

### 3. Configure the backend

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and set `SECRET_KEY`, `DATABASE_URL`, `TEST_DATABASE_URL`, and `ADMIN_SETUP_SECRET`. Keep `SESSION_COOKIE_SECURE=false` only for local HTTP development. Set it to `true` in production.

Example values:

```text
SECRET_KEY=replace_with_a_long_random_local_secret
DATABASE_URL=mysql+pymysql://hospital_app:your_password@127.0.0.1:3306/hospital_outpatient
TEST_DATABASE_URL=mysql+pymysql://hospital_app:your_password@127.0.0.1:3306/hospital_outpatient_test
ADMIN_SETUP_SECRET=replace_with_a_long_random_setup_secret
SESSION_HOURS=8
SESSION_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SECURE=false
CSRF_ENABLED=true
```

`ADMIN_SETUP_SECRET` must be at least 16 characters. It guards the one time administrator setup endpoint. Generate it with a password manager or a command such as:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

This workspace uses port 3307 because its bundled MySQL listens there. A standard MySQL install usually uses 3306.

### 4. Create the schema and demo data

```powershell
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe db upgrade
..\.venv\Scripts\flask.exe seed-demo
..\.venv\Scripts\flask.exe check-db
```

The migrations create all tables, the audit trigger, the booking stored procedure, and the administrator setup marker.

### 5. Create the first administrator

The seed file does not contain an administrator password. Create the first administrator with the controlled command, from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe setup-admin --email admin@example.com --generate-password
```

The command asks for `ADMIN_SETUP_SECRET` when it is not supplied on the command line. It prints the generated password once. Store that password in a password manager before closing the terminal. It is not written to the repository, the database, or the documentation. The database stores only the PBKDF2 hash.

For a scripted local setup, pass `--setup-secret` and `--password` instead. Do not put a real password in a command that is saved to shell history or a log.

After setup succeeds, the setup marker is written to `system_setting`. The setup endpoint then returns `409 setup_completed` for every later request. Use the administrator security page to change the email or password.

### 6. Start the application

Open two terminals.

Backend, from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\python.exe run.py
```

Frontend, from `frontend`:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` requests to `http://127.0.0.1:5000`.

## Demo accounts

The seed file contains synthetic patient and doctor accounts only.

| Role | Email | Password |
| --- | --- | --- |
| Doctor | `meera.iyer@example.com` | `Doctor@123` |
| Patient | `riya.kapoor@example.com` | `Patient@123` |

All data is synthetic. Do not enter real patient information.

The administrator account is created locally with `flask setup-admin`. The generated password is shown once and is never committed. The login page no longer offers an administrator demo button.

## Creating accounts

Public registration creates patient accounts only.

### First administrator

Use the first time setup page at `/setup` or the `flask setup-admin` command. Both paths require `ADMIN_SETUP_SECRET` in the backend environment. The first successful setup creates one administrator and permanently closes the setup endpoint.

If an administrator already exists, `flask setup-admin` refuses to run without `--rotate`. Rotation changes the existing account in place, so the account identifier, doctors, patients, appointments, tests, diagnoses, and prescriptions are preserved.

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe setup-admin --rotate --email admin@example.com --generate-password
```

The command asks for the current password, hashes the new password, and prints the new password once. Existing sessions become invalid because the stored password hash changes.

### Doctor account

1. Sign in with an administrator account.
2. Open **Doctors** in the left sidebar.
3. Click **Add doctor**.
4. Enter the doctor name, specialization, phone, department, login email, and temporary password.
5. Click **Create doctor**.

The doctor record and the doctor login account are created together. The doctor can sign in with the temporary password. The administrator can reset that password later from the same page.

## Tests

Backend, from `backend`:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

Frontend, from `frontend`:

```powershell
npm test
npm run build
```

## Reset the demonstration

From `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe reset-demo
```

This deletes the demonstration rows, including the administrator account and the setup marker, restarts identifiers from 1, and loads a fresh data set. Run `flask setup-admin` again after a reset. This command is for a local synthetic demonstration only. Never run it against the production database.

## Documentation

| File | Purpose |
| --- | --- |
| [Project_Report.md](Project_Report.md) | Full project report with scope, design, results, and limitations |
| [Database_Explanation.md](Database_Explanation.md) | Tables, relationships, constraints, indexes, trigger, procedure, and sample queries |
| [Code_Walkthrough.md](Code_Walkthrough.md) | Guided tour of backend and frontend code |
| [Test_Report.md](Test_Report.md) | Automated and manual test evidence |
| [Demo_Guide.md](Demo_Guide.md) | Setup and a short demonstration script |
| [Viva_Preparation.md](Viva_Preparation.md) | Questions and answers for the project viva |
| [Project_Summary.md](Project_Summary.md) | Short submission summary |
| [Deployment_Guide.md](Deployment_Guide.md) | Vercel, Render, Aiven, environment variables, cold starts, and production rotation |

## Known limitations

The project is an educational demonstration, not a clinical system.

* It has no email verification, patient password reset, or multi factor authentication.
* Sessions use a signed Flask session cookie, not a separate token service.
* A CSRF token is required for state changing requests, but there is no rate limiting or account lockout after repeated failed logins.
* Password changes invalidate sessions through a stored password hash fingerprint. There is no separate server side session revocation list.
* The application sets basic security headers. It does not set a Content Security Policy or HTTP Strict Transport Security header itself. The hosting providers terminate HTTPS, and production must set `SESSION_COOKIE_SECURE=true`.
* The free Render service spins down after inactivity, so the first request can take about one minute. The live check on 30 October 2026 observed about 37 seconds.
* The free Aiven MySQL service has a 76 connection limit, can power off after inactivity, and has no static IP addresses.
* Diagnostic tests store typed summaries, not scanned reports or file uploads.
* Prescriptions store medication and treatment details as text. There is no medicine inventory.
* There is no payment, insurance, SMS, or email integration.
* The interface is available in English only.
* There is no laboratory system integration. Test results are entered by the doctor.
* Concurrent booking protection depends on MySQL transactions and the unique active slot constraint. It is tested at a small scale, not under production load.
* The project does not claim zero defects. The tested workflows pass, and the remaining limits are listed above.
