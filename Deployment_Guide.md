# Deployment Guide

This project uses three free services, each with one job:

| Part | Service | Live address | Job |
| --- | --- | --- | --- |
| Frontend | Vercel | `https://clinic-frontend-nine-gold.vercel.app/` | Serves the React application |
| Backend | Render | `https://dbms-mini-project-ybmr.onrender.com` | Runs the Flask API |
| Database | Aiven | Private MySQL 8.4 service | Stores patients, doctors, appointments, and records |

The repository contains `frontend/vercel.json`. The backend is started with Gunicorn on Render. The application is configured to reach the database over TLS with the CA certificate in `backend/ca.pem`.

## 1. Current live status

The live check on 30 October 2026 found:

* The Render health endpoint returned `200` with `{"status":"ok","service":"hospital outpatient api"}`.
* The Render departments endpoint returned the six synthetic departments.
* The Render setup status endpoint returned `200` with `{"setup_required":false,"setup_completed":true,"setup_available":false,"admin_exists":true}`.
* The Vercel site served the current frontend build. The login page no longer showed the administrator demo button, and the footer no longer showed the standalone synthetic data line.
* The Vercel `/setup` page showed "Setup is already complete".
* The live API calls took about 37 seconds on the first page load. This is consistent with a Render free service cold start.
* The Aiven database still lacks the `system_setting` table. The backend fallback closes setup when an administrator row exists.
* The production administrator password has not been rotated from the old public demonstration password. The local development password was rotated, but that does not change Aiven.

Run `flask db upgrade` against Aiven to create `system_setting`, then rotate the production administrator. The public site can serve requests in the current state, but the setup marker and the production password still need attention.

## 2. Required production environment variables

Set these in the Render service environment. Do not commit real values.

| Variable | Production value |
| --- | --- |
| `SECRET_KEY` | A long random value, at least 32 characters, unique to production |
| `DATABASE_URL` | The Aiven MySQL URI, including TLS settings |
| `CORS_ORIGINS` | The Vercel production origin, for example `https://clinic-frontend-nine-gold.vercel.app` |
| `ADMIN_SETUP_SECRET` | A long random value, at least 16 characters, used only for first time setup |
| `SESSION_COOKIE_SECURE` | `true` |
| `SESSION_COOKIE_SAMESITE` | `Lax` |
| `SESSION_HOURS` | `8` |
| `CSRF_ENABLED` | `true` |
| `APP_TIMEZONE` | `Asia/Kolkata` |
| `FLASK_ENV` | `production` |

`SECRET_KEY` signs the Flask session cookie. If it changes, every existing session becomes invalid. That is acceptable during a security rotation, but it signs every user out.

`ADMIN_SETUP_SECRET` is only needed until the first administrator exists. After setup succeeds, remove it from Render or rotate it. The setup endpoint still returns `setup_completed`, so it cannot create a second administrator.

`CORS_ORIGINS` must list exact origins. Do not use `*` because the API uses credentialed requests.

## 3. Aiven MySQL 8.4

### 3.1 Free plan limits

Aiven documents these limits for the free MySQL plan:

* One node, one CPU, 1 GB RAM, and 1 GB disk.
* `max_connections` is 76 for the whole service.
* No static IP addresses, no VPC, no integrations, and no forking.
* One free service of each service type per organization.
* The service can be powered off after a period of inactivity. A notification is sent before power off, and the service can be powered on again.
* The free plan is not covered by the 99.99 percent SLA.

The application uses SQLAlchemy's default pool of five connections with up to ten overflow connections per worker. With two Gunicorn workers, the maximum is about 30 connections, below the Aiven limit of 76. Keep the worker count small on the free Render instance. Do not raise the pool size without checking the Aiven limit.

### 3.2 Network access

Aiven allows all inbound addresses by default with `0.0.0.0/0`. For a demonstration, the practical options are:

1. Keep the Aiven public endpoint open and rely on the application's verified TLS connection, a strong database password, and the 76 connection cap. This is the simplest option for a Render free service.
2. Restrict the Aiven IP allowlist to the Render outbound ranges for the selected region. Render publishes shared outbound ranges in the service Connect panel. These ranges can change, so review them after platform changes.
3. Use Render dedicated outbound IPs. This requires a Pro workspace and a monthly fee, so it is outside the free setup.

A single fixed Render IP is not available on the free plan. Do not document an allowlist entry as permanent unless dedicated IPs are purchased.

### 3.3 TLS

Aiven MySQL does not enforce TLS for every database user by default. It accepts unencrypted connections unless the user is created with `REQUIRE SSL`. This project therefore configures TLS explicitly and verifies the server certificate. The repository contains `backend/ca.pem`. Include the CA in the SQLAlchemy URL, for example:

```text
mysql+pymysql://avnadmin:REPLACE_ME@HOST:PORT/defaultdb?ssl_ca=ca.pem&ssl_verify_cert=true
```

The exact host, port, user, and database name come from the Aiven console. Keep the real URI in the Render environment only.

For defence in depth, the Aiven database user can also be required to use TLS:

```sql
ALTER USER 'avnadmin'@'%' REQUIRE SSL;
```

Run that only after the application is confirmed to connect with `ssl_ca` and `ssl_verify_cert`. Otherwise the backend loses its database connection.

### 3.4 Schema and data

For a fresh demonstration database, run the migrations and seed from a trusted machine with the production `DATABASE_URL` set:

```powershell
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe db upgrade
..\.venv\Scripts\flask.exe seed-demo
..\.venv\Scripts\flask.exe check-db
```

For an existing database with clinical data, run only `flask db upgrade`. The administrator setup migration creates `system_setting` and marks setup complete when an administrator already exists. It does not delete or rewrite doctors, patients, appointments, tests, diagnoses, or prescriptions. Until this migration runs, the backend fallback closes setup when an administrator row exists. Run the migration as soon as possible so the marker is explicit.

Never run `flask reset-demo` against Aiven. That command deletes the synthetic rows, the administrator account, and the setup marker. It is a local demonstration command only.

## 4. Render backend

Create a Web Service from the repository with these settings:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Python 3 |
| Build command | `pip install -r requirements.txt` |
| Start command | `gunicorn run:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120` |
| Health check path | `/api/health` |
| Instance type | Free |

Add the environment variables from section 2. Deploy and confirm:

```powershell
Invoke-WebRequest https://dbms-mini-project-ybmr.onrender.com/api/health -UseBasicParsing
```

A healthy response is:

```json
{"status":"ok","service":"hospital outpatient api"}
```

### 4.1 Free plan behaviour

Render documents these free web service limits:

* The service spins down after 15 minutes without inbound traffic.
* The next request starts it again. Render says this takes about one minute.
* Each workspace receives 750 free instance hours per calendar month.
* The free instance has 512 MB RAM and an ephemeral filesystem.
* Free services can restart at any time and do not support shell access or persistent disks.

The live check observed about 37 seconds for the first request. The frontend shows a loading state while the API wakes. A keep alive ping every 10 to 14 minutes can reduce cold starts, but one always on free service uses about 720 of the 750 monthly hours. That leaves little room for another free service in the same workspace. Do not claim that cold starts are eliminated.

### 4.2 Security checks after deploy

1. Confirm the API is served over HTTPS.
2. Confirm the session cookie has `Secure`, `HttpOnly`, and `SameSite=Lax`.
3. Confirm a state changing request without `X-CSRF-Token` returns `403 csrf_failed`.
4. Confirm `GET /api/admin/summary` returns `401` without a session.
5. Confirm a patient or doctor session receives `403` on `/api/admin/summary`.
6. Confirm `/api/auth/setup-status` reports `setup_completed: true` after the administrator exists.

## 5. Vercel frontend

Import the repository and use these settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

`frontend/vercel.json` rewrites `/api/:path*` to the Render API and sends every other path to `index.html` for React Router. The frontend calls the API through the same Vercel origin, so the browser does not need a separate CORS preflight for normal use.

After deployment, check the live login page. The administrator demo button must be gone. The page must show the first time setup link and the password change notice. If the old button is still visible, the old build is still cached or the deployment did not use the current commit.

## 6. Production administrator rotation

The old production administrator password was public in the previous documentation. Treat it as compromised.

Run the rotation from a trusted local machine with the production `DATABASE_URL` and `ADMIN_SETUP_SECRET` set in `backend/.env`, or pass them through the environment for that command only:

```powershell
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe setup-admin --rotate --email admin@example.com --generate-password
```

The command:

1. Finds the existing administrator account.
2. Asks for the current password.
3. Hashes the new password with PBKDF2 SHA256 and 600,000 iterations.
4. Updates the existing account row in place.
5. Prints the new password once.
6. Leaves every doctor, patient, appointment, test, diagnosis, and prescription untouched.

Store the new password in a password manager. Do not put it in Git, chat, documentation, screenshots, or Render logs.

The password hash changes, so every old session fails the fingerprint check on its next request. The old password stops working immediately. Verify both conditions:

```text
old password login -> 401 invalid_credentials
new password login -> 200
```

If the production database has no administrator, use the first time setup page or `flask setup-admin` without `--rotate` and with `ADMIN_SETUP_SECRET`. If an administrator exists, setup returns `409 setup_completed`.

## 7. Deployment order

Use this order to avoid a window where the new frontend talks to an old API:

1. Back up the Aiven database or confirm the latest automated backup.
2. Run `flask db upgrade` against Aiven.
3. Deploy the new Render backend with the production environment variables.
4. Rotate the production administrator password.
5. Deploy the new Vercel frontend.
6. Verify health, login, CSRF, role checks, setup status, and the administrator security page.
7. Remove `ADMIN_SETUP_SECRET` from Render after setup is confirmed complete.

## 8. Rollback

* Vercel can redeploy an earlier build from the deployment history.
* Render can roll back to one of the two most recent deploys on the free plan.
* The administrator setup migration adds one table. Do not downgrade it after production use unless the database is being restored from a backup. Downgrading drops `system_setting` and would reopen first time setup if the administrator row were also removed.

## 9. What this deployment does not provide

* No high availability. Aiven free is a single node and Render free is a single instance.
* No guaranteed uptime. Both free services can restart or power down.
* No static outbound IP on Render free, so a narrow Aiven allowlist is not reliable without paid dedicated IPs.
* No Content Security Policy or HTTP Strict Transport Security header from Flask. HTTPS is provided by the hosting platforms.
* No rate limiting, account lockout, email verification, or multi factor authentication.
* No committed end to end browser test suite for the live deployment.
