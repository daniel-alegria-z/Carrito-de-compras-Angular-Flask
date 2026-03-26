from decimal import Decimal, ROUND_HALF_UP

from backend.models import Producto
from backend.utils.validadores import ValidationError


IVA_RATE = Decimal("0.19")
MONEY_QUANTIZER = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    # Estandariza redondeo monetario para evitar diferencias entre cliente y servidor.
    return value.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def validar_y_calcular_carrito(items: list[dict]) -> dict:
    # El backend es la fuente de verdad para existencia, stock y totales.
    product_ids = [item["id"] for item in items]
    productos = Producto.query.filter(Producto.id.in_(product_ids)).all()
    productos_por_id = {producto.id: producto for producto in productos}

    missing_ids = [pid for pid in product_ids if pid not in productos_por_id]
    if missing_ids:
        missing_id = missing_ids[0]
        raise ValidationError(
            f"Producto ID {missing_id} no existe.",
            code="PRODUCT_NOT_FOUND",
            status_code=400,
        )

    detalle_items: list[dict] = []
    subtotal = Decimal("0")

    for item in items:
        producto = productos_por_id[item["id"]]
        cantidad = item["cantidad"]

        # Evita confirmar compras por encima del inventario actual.
        if cantidad > producto.stock:
            raise ValidationError(
                (
                    f"Stock insuficiente para: {producto.nombre} "
                    f"(disponible: {producto.stock}, solicitado: {cantidad})"
                ),
                code="INSUFFICIENT_STOCK",
                status_code=400,
            )

        precio = _money(Decimal(str(producto.precio)))
        line_subtotal = _money(precio * Decimal(cantidad))
        subtotal += line_subtotal

        detalle_items.append(
            {
                "id": producto.id,
                "nombre": producto.nombre,
                "precio": float(precio),
                "cantidad": cantidad,
                "subtotal": float(line_subtotal),
            }
        )

    # Calcula impuestos y total final del pedido.
    subtotal = _money(subtotal)
    iva = _money(subtotal * IVA_RATE)
    total = _money(subtotal + iva)

    return {
        "success": True,
        "carrito": {
            "items": detalle_items,
            "subtotal": float(subtotal),
            "iva": float(iva),
            "descuentoPrimeraCompra": 0.0,
            "total": float(total),
        },
    }
