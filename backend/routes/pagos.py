from flask import Blueprint, jsonify, request

from backend.services.pago_service import obtener_orden, procesar_pago


pagos_bp = Blueprint("pagos", __name__, url_prefix="/api")


@pagos_bp.post("/pagar")
def pagar():
    # Procesa pago y confirma la orden si la pasarela simulada aprueba.
    payload = request.get_json(silent=True)
    response, status_code = procesar_pago(payload)
    return jsonify(response), status_code


@pagos_bp.get("/orden/<string:codigo_orden>")
def get_orden(codigo_orden: str):
    # Recupera orden por codigo para la vista de confirmacion del frontend.
    response, status_code = obtener_orden(codigo_orden)
    return jsonify(response), status_code
