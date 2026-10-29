# General Hospital Outpatient Management System

A focused undergraduate DBMS mini project for outpatient appointments and consultation records. The system connects patients, doctors, and hospital administrators through one working web application backed by MySQL 8.

The project demonstrates relational design, foreign keys, check constraints, a generated column, a unique active slot rule, joins, aggregate queries, transactions, a stored procedure, an audit trigger, session authentication, role based permissions, and a responsive React interface.

![Public home page](screenshots/01-public-home.png)

## Project status

The application is implemented and verified in this workspace.

| Check | Result |
| --- | --- |
| Backend tests | 41 passed |
| Frontend tests | 23 passed across 7 files |
| Production build | Passed |
| Demo data reset | Passed |
| Database object check | Trigger and procedure present |
| Manual browser acceptance | Completed for the main workflows |

The exact commands and results are recorded in [Test_Report.md](Test_Report.md).

## Roles

| Role | Main abilities |
| --- | --- |
| Patient | Register, sign in, browse doctors and facilities, book or cancel appointments, view own appointments and clinical records, update own profile, print records |
| Doctor | View only assigned appointments, move appointments through allowed statuses, order optional tests, record results, diagnosis, prescription, treatment plan, and follow up date |
| Administrator | Manage departments, doctors, schedules, time off, and all appointments, reset doctor passwords, cancel eligible appointments |

Doctors are hospital users with narrower clinical permissions than administrators. The three roles are intentionally kept separate.

## Main workflow

1. A patient registers or signs in.
2. The patient compares departments, doctors, clinic hours, and open slots.
3. The patient books a slot.
4. The server validates the slot inside a transaction and prevents conflicts.
5. The doctor checks the patient in and records clinical work.
6. Diagnostic tests are optional. A diagnosis and prescription can exist without tests.
7. The patient sees the completed record and can print it.

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

Edit `backend\.env` and set `SECRET_KEY`, `DATABASE_URL`, and `TEST_DATABASE_URL`.

Example values:

```text
SECRET_KEY=replace_with_a_long_random_local_secret
DATABASE_URL=mysql+pymysql://hospital_app:your_password@127.0.0.1:3306/hospital_outpatient
TEST_DATABASE_URL=mysql+pymysql://hospital_app:your_password@127.0.0.1:3306/hospital_outpatient_test
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

The migrations create all tables, the audit trigger, and the booking stored procedure.

### 5. Start the application

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

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@cityhospital.example` | `Admin@123` |
| Doctor | `meera.iyer@example.com` | `Doctor@123` |
| Patient | `riya.kapoor@example.com` | `Patient@123` |

All data is synthetic. Do not enter real patient information.

## Creating accounts

Public registration creates patient accounts only.

### Administrator account

The demonstration administrator is created by `seed-demo`. To create another administrator, run this from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe create-admin --email admin2@cityhospital.example
```

The command prompts for a password. The password must be 8 to 128 characters and include at least one letter and one number. The password is hashed before storage. The new account has the `admin` role and is not linked to a patient or doctor record.

This command is the controlled setup path for administrator accounts. Public registration never creates an administrator.

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

This deletes the demonstration rows, restarts identifiers from 1, and loads a fresh data set.

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

## Known limitations

The project is an educational demonstration, not a clinical system.

* It has no email verification, patient password reset, or multi factor authentication.
* Sessions use a server side Flask session cookie. There is no separate token service.
* There is no explicit CSRF token. The app relies on `SameSite=Lax`, JSON requests, and a small allowed origin list.
* There is no rate limiting or account lockout after repeated failed logins.
* Diagnostic tests store typed summaries, not scanned reports or file uploads.
* Prescriptions store medication and treatment details as text. There is no medicine inventory.
* There is no payment, insurance, SMS, or email integration.
* The interface is available in English only.
* There is no laboratory system integration. Test results are entered by the doctor.
* Concurrent booking protection depends on MySQL transactions and the unique active slot constraint. It is tested at a small scale, not under production load.
* The project does not claim zero defects. The tested workflows pass, and the remaining limits are listed above.
