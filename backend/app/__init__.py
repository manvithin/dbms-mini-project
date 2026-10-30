from flask import Flask, jsonify
from sqlalchemy import text

from .config import Config
from .errors import register_error_handlers
from .extensions import cors, db, migrate


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    app.json.sort_keys = False
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    from .admin import admin_bp
    from .appointments import appointment_bp, patient_bp
    from .auth import auth_bp
    from .doctor import clinical_bp, doctor_bp
    from .public import public_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(patient_bp)
    app.register_blueprint(appointment_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(clinical_bp)
    app.register_blueprint(admin_bp)

    register_error_handlers(app)

    from .auth import csrf_protect

    app.before_request(csrf_protect)

    from .cli import register_cli

    register_cli(app)

    @app.get("/api/health")
    def health():
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ok", "service": "hospital outpatient api"})

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if response.content_type and response.content_type.startswith("application/json"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    return app
