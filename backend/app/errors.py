import logging

from flask import jsonify
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException

from .extensions import db

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """An expected application error that is safe to return to the client."""

    def __init__(self, message, status_code=400, code="request_error", fields=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.fields = fields or {}

    def to_response(self):
        payload = {"error": self.message, "code": self.code}
        if self.fields:
            payload["fields"] = self.fields
        return jsonify(payload), self.status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        return error.to_response()

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        db.session.rollback()
        original = str(error.orig or "").lower()
        if "duplicate entry" in original or "unique constraint" in original:
            message = "This record conflicts with existing data."
            code = "duplicate_record"
            status = 409
        elif "foreign key constraint" in original:
            message = "A related record is missing or still in use."
            code = "invalid_relationship"
            status = 400
        elif "check constraint" in original:
            message = "The submitted values do not satisfy a database rule."
            code = "constraint_error"
            status = 400
        else:
            message = "The record could not be saved."
            code = "database_error"
            status = 400
        logger.warning("Database integrity error: %s", original)
        return jsonify({"error": message, "code": code}), status

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "The requested page or record was not found.", "code": "not_found"}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return jsonify({"error": "This request method is not allowed.", "code": "method_not_allowed"}), 405

    @app.errorhandler(413)
    def handle_too_large(error):
        return jsonify({"error": "The request is too large.", "code": "request_too_large"}), 413

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"error": error.description, "code": error.name.lower().replace(" ", "_")}), error.code

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        db.session.rollback()
        logger.exception("Unhandled database error")
        return jsonify({"error": "A database error occurred. Please try again.", "code": "database_error"}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        db.session.rollback()
        logger.exception("Unhandled application error")
        return jsonify({"error": "Something went wrong. Please try again.", "code": "server_error"}), 500
