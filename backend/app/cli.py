import hmac
import secrets
import string

import click
from flask import current_app
from sqlalchemy import text
from werkzeug.security import check_password_hash, generate_password_hash

from .auth import mark_setup_completed, setup_completed
from .db_objects import install_database_objects
from .errors import ApiError
from .extensions import db
from .models import (
    Appointment,
    Department,
    Doctor,
    Doctor_Schedule,
    Patient,
    Prescription,
    Test_Order,
    User_Account,
    utcnow,
)
from .seed import DEMO_ACCOUNTS, seed_demo_data
from .validation import validate_email, validate_password


def generate_initial_password(length=20):
    """Create a strong random password with at least one letter and one number."""
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(character.isalpha() for character in password) and any(
            character.isdigit() for character in password
        ):
            return password


def register_cli(app):
    @app.cli.command("db-objects")
    def db_objects_command():
        """Create the audit trigger and booking stored procedure."""
        install_database_objects()
        click.echo("Database objects installed.")

    @app.cli.command("setup-admin")
    @click.option("--email", default=None, help="Administrator sign in email.")
    @click.option("--password", default=None, help="New password. Omit to be prompted.")
    @click.option(
        "--generate-password",
        is_flag=True,
        help="Generate a strong password and print it once.",
    )
    @click.option(
        "--rotate",
        is_flag=True,
        help="Rotate the existing administrator credentials in place.",
    )
    @click.option(
        "--current-password",
        default=None,
        help="Current password for rotation. Omit to be prompted.",
    )
    @click.option(
        "--setup-secret",
        default=None,
        help="Value of ADMIN_SETUP_SECRET. Prompted when omitted for first time setup.",
    )
    def setup_admin_command(
        email, password, generate_password, rotate, current_password, setup_secret
    ):
        """Create the first administrator or rotate existing administrator credentials."""
        if rotate:
            admin = User_Account.query.filter_by(role="admin").order_by(User_Account.user_id).first()
            if admin is None:
                raise click.ClickException("No administrator account exists. Run setup without --rotate.")
            if not current_password:
                current_password = click.prompt(
                    "Current administrator password", hide_input=True
                )
            if not check_password_hash(admin.password_hash, current_password):
                raise click.ClickException("Current administrator password is incorrect.")
            if not email:
                email = admin.username
        else:
            if setup_completed():
                raise click.ClickException(
                    "Administrator setup is already complete. Use --rotate to change credentials."
                )
            configured_secret = current_app.config.get("ADMIN_SETUP_SECRET") or ""
            if len(configured_secret) < 16:
                raise click.ClickException(
                    "Set ADMIN_SETUP_SECRET to at least 16 characters before first time setup."
                )
            if not setup_secret:
                setup_secret = click.prompt("ADMIN_SETUP_SECRET", hide_input=True)
            if not hmac.compare_digest(setup_secret, configured_secret):
                raise click.ClickException("The setup secret is incorrect.")
            if not email:
                email = click.prompt("Administrator email")
            admin = User_Account(
                username="pending@example.invalid",
                password_hash=generate_password_hash(
                    "Pending1password", method="pbkdf2:sha256:600000"
                ),
                role="admin",
                is_active=True,
            )

        try:
            email = validate_email(email)
        except ApiError as error:
            message = next(iter(error.fields.values()), error.message)
            raise click.ClickException(message)

        duplicate = User_Account.query.filter(
            User_Account.username == email,
            User_Account.user_id != (admin.user_id or 0),
        ).first()
        if duplicate is not None:
            raise click.ClickException("An account with this email already exists.")

        if generate_password:
            password = generate_initial_password()
        elif not password:
            password = click.prompt(
                "New administrator password", hide_input=True, confirmation_prompt=True
            )
        try:
            password = validate_password(password)
        except ApiError as error:
            message = next(iter(error.fields.values()), error.message)
            raise click.ClickException(message)

        admin.username = email
        admin.password_hash = generate_password_hash(password, method="pbkdf2:sha256:600000")
        if admin.user_id is None:
            db.session.add(admin)
        mark_setup_completed(utcnow().isoformat())
        db.session.commit()

        action = "rotated" if rotate else "created"
        click.echo(f"Administrator account {action} for {email}.")
        if generate_password:
            click.echo("Store this password now. It is not saved anywhere else.")
            click.echo(f"Password: {password}")


    @app.cli.command("seed-demo")
    @click.option("--reset", is_flag=True, help="Replace existing demo data.")
    def seed_demo_command(reset):
        """Load synthetic demo departments, doctors, patients, and appointments."""
        install_database_objects()
        try:
            counts = seed_demo_data(reset=reset)
        except RuntimeError as error:
            raise click.ClickException(str(error))
        click.echo("Demo data loaded.")
        for key, value in counts.items():
            click.echo(f"{key}: {value}")
        click.echo("Demo accounts:")
        for email, password, role in DEMO_ACCOUNTS:
            click.echo(f"{role}: {email} / {password}")
        click.echo("Administrator: run flask setup-admin to create the first administrator.")

    @app.cli.command("reset-demo")
    def reset_demo_command():
        """Delete demo data and load a fresh demonstration data set."""
        install_database_objects()
        counts = seed_demo_data(reset=True)
        click.echo("Demo data reset.")
        for key, value in counts.items():
            click.echo(f"{key}: {value}")
        click.echo("Demo accounts:")
        for email, password, role in DEMO_ACCOUNTS:
            click.echo(f"{role}: {email} / {password}")
        click.echo("Administrator: run flask setup-admin to create the first administrator.")

    @app.cli.command("check-db")
    def check_db_command():
        """Print table counts and confirm database objects exist."""
        counts = {
            "departments": Department.query.count(),
            "doctors": Doctor.query.count(),
            "patients": Patient.query.count(),
            "accounts": User_Account.query.count(),
            "schedules": Doctor_Schedule.query.count(),
            "appointments": Appointment.query.count(),
            "test_orders": Test_Order.query.count(),
            "prescriptions": Prescription.query.count(),
        }
        for key, value in counts.items():
            click.echo(f"{key}: {value}")
        trigger = db.session.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.triggers "
                "WHERE trigger_schema = DATABASE() AND trigger_name = 'trg_appointment_status_audit'"
            )
        ).scalar()
        procedure = db.session.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.routines "
                "WHERE routine_schema = DATABASE() AND routine_name = 'sp_book_appointment'"
            )
        ).scalar()
        click.echo(f"audit trigger: {'present' if trigger else 'missing'}")
        click.echo(f"booking procedure: {'present' if procedure else 'missing'}")
        click.echo(f"database: {current_app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
