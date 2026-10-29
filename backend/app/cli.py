import click
from flask import current_app
from sqlalchemy import text
from werkzeug.security import generate_password_hash

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
)
from .seed import DEMO_ACCOUNTS, seed_demo_data
from .validation import validate_email, validate_password


def register_cli(app):
    @app.cli.command("db-objects")
    def db_objects_command():
        """Create the audit trigger and booking stored procedure."""
        install_database_objects()
        click.echo("Database objects installed.")

    @app.cli.command("create-admin")
    @click.option("--email", prompt="Administrator email")
    @click.option("--password", prompt="Password", hide_input=True, confirmation_prompt=True)
    def create_admin_command(email, password):
        """Create an administrator account for controlled hospital setup."""
        try:
            email = validate_email(email)
            password = validate_password(password)
        except ApiError as error:
            message = next(iter(error.fields.values()), error.message)
            raise click.ClickException(message)

        if User_Account.query.filter_by(username=email).first():
            raise click.ClickException("An account with this email already exists.")

        account = User_Account(
            username=email,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256:600000"),
            role="admin",
            is_active=True,
        )
        db.session.add(account)
        db.session.commit()
        click.echo(f"Administrator account created for {email}.")

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
