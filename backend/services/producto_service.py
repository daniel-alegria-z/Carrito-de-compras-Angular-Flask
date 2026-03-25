from backend.models import Producto


def listar_productos() -> list[dict]:
    productos = Producto.query.order_by(Producto.id.asc()).all()
    return [producto.to_dict() for producto in productos]
