from flask import Blueprint, jsonify

from backend.models import Producto


productos_bp = Blueprint("productos", __name__, url_prefix="/api")


@productos_bp.get("/productos")
def listar_productos():
    # Lista catalogo ordenado por id para mantener una presentacion estable.
    productos = Producto.query.order_by(Producto.id.asc()).all()
    return jsonify([producto.to_dict() for producto in productos]), 200
