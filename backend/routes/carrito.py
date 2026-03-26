from flask import Blueprint, jsonify, request

from backend.services.carrito_validacion_service import validar_y_calcular_carrito
from backend.utils.validadores import validar_items_payload


carrito_bp = Blueprint("carrito", __name__, url_prefix="/api")


@carrito_bp.post("/carrito/validar")
def validar_carrito():
    # Recalcula totales en servidor para evitar manipulacion del cliente.
    payload = request.get_json(silent=True)
    items = validar_items_payload(payload)
    resultado = validar_y_calcular_carrito(items)
    return jsonify(resultado), 200
