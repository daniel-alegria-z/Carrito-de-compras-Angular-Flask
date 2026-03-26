from flask import Flask, jsonify
from flask_cors import CORS

from backend.config import Config
from backend.extensions import db
from backend.routes.carrito import carrito_bp
from backend.routes.pagos import pagos_bp
from backend.routes.productos import productos_bp
from backend.seed import seed_productos
from backend.utils.logger import configure_logging
from backend.utils.validadores import ValidationError


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    # Configura logging y CORS global de la API.
    configure_logging(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    db.init_app(app)

    # Registra modulos de rutas.
    app.register_blueprint(productos_bp)
    app.register_blueprint(carrito_bp)
    app.register_blueprint(pagos_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"success": True, "message": "Backend running"}), 200

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        # Errores de negocio/controlados: mantienen codigo y mensaje esperados por frontend.
        return (
            jsonify({"success": False, "error": error.message, "code": error.code}),
            error.status_code,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        # Error inesperado: se loguea detalle y se responde un mensaje generico.
        app.logger.exception("Unexpected server error")
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Ocurrio un error interno del servidor.",
                    "code": "INTERNAL_SERVER_ERROR",
                }
            ),
            500,
        )

    @app.cli.command("init-db")
    def init_db_command():
        """Create database tables."""
        with app.app_context():
            # Crea todas las tablas segun los modelos SQLAlchemy.
            db.create_all()
            print("Database tables created.")

    @app.cli.command("seed")
    def seed_command():
        """Seed initial products."""
        with app.app_context():
            # Inserta o actualiza productos base para pruebas locales.
            inserted, updated = seed_productos()
            print(f"Seed complete. inserted={inserted}, updated={updated}")

    return app


app = create_app()


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
