import random
import string
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from backend.extensions import db
from backend.models import Orden, OrdenDetalle, Pago, Producto
from backend.services.carrito_validacion_service import validar_y_calcular_carrito
from backend.utils.validadores import ValidationError, validar_items_payload, validar_pago_payload


APPROVAL_RATE = 0.9
DECLINE_REASONS = [
    "Fondos insuficientes",
    "Tarjeta expirada",
    "Limite excedido",
]
MONEY_QUANTIZER = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def _to_iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _simular_pasarela() -> tuple[bool, str | None]:
    if random.random() < APPROVAL_RATE:
        return True, None
    return False, random.choice(DECLINE_REASONS)


def _generar_codigo_orden() -> str:
    date_key = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"ORD-{date_key}-"

    ultima = (
        Orden.query.filter(Orden.codigo.like(f"{prefix}%"))
        .order_by(Orden.id.desc())
        .first()
    )

    secuencia = 1
    if ultima and ultima.codigo:
        try:
            secuencia = int(ultima.codigo.split("-")[-1]) + 1
        except ValueError:
            secuencia = ultima.id + 1

    return f"{prefix}{secuencia:03d}"


def _generar_referencia_pago() -> str:
    date_key = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"REF-PAY-{date_key}-{suffix}"


def _construir_detalles_orden(orden: Orden) -> list[dict]:
    items: list[dict] = []
    for detalle in orden.detalles:
        precio = _money(Decimal(str(detalle.precio_unitario)))
        subtotal = _money(precio * Decimal(detalle.cantidad))
        nombre = detalle.producto.nombre if detalle.producto else "Producto"
        items.append(
            {
                "id": detalle.producto_id,
                "nombre": nombre,
                "cantidad": detalle.cantidad,
                "precio": float(precio),
                "subtotal": float(subtotal),
            }
        )
    return items


def procesar_pago(payload: dict) -> tuple[dict, int]:
    items = validar_items_payload(payload)
    metodo, usuario = validar_pago_payload(payload)

    validacion = validar_y_calcular_carrito(items)["carrito"]

    aprobado, motivo_rechazo = _simular_pasarela()
    if not aprobado:
        return (
            {
                "success": False,
                "error": "Pago rechazado por pasarela",
                "code": "PAYMENT_DECLINED",
                "motivo": motivo_rechazo,
                "orden_id": None,
            },
            402,
        )

    product_ids = [item["id"] for item in items]
    productos = Producto.query.filter(Producto.id.in_(product_ids)).all()
    productos_por_id = {producto.id: producto for producto in productos}

    missing_ids = [pid for pid in product_ids if pid not in productos_por_id]
    if missing_ids:
        raise ValidationError(
            f"Producto ID {missing_ids[0]} no existe.",
            code="PRODUCT_NOT_FOUND",
            status_code=400,
        )

    try:
        for item in items:
            producto = productos_por_id[item["id"]]
            if item["cantidad"] > producto.stock:
                raise ValidationError(
                    (
                        f"Stock insuficiente para: {producto.nombre} "
                        f"(disponible: {producto.stock}, solicitado: {item['cantidad']})"
                    ),
                    code="INSUFFICIENT_STOCK",
                    status_code=400,
                )

        codigo_orden = _generar_codigo_orden()
        referencia = _generar_referencia_pago()

        subtotal = _money(Decimal(str(validacion["subtotal"])))
        iva = _money(Decimal(str(validacion["iva"])))
        descuento = _money(Decimal(str(validacion["descuentoPrimeraCompra"])))
        total = _money(Decimal(str(validacion["total"])))

        orden = Orden(
            codigo=codigo_orden,
            usuario_nombre=usuario["nombre"],
            usuario_email=usuario["email"],
            subtotal=subtotal,
            iva=iva,
            descuento=descuento,
            total=total,
            estado="confirmado",
        )
        db.session.add(orden)
        db.session.flush()

        for item in items:
            producto = productos_por_id[item["id"]]
            cantidad = item["cantidad"]
            precio_unitario = _money(Decimal(str(producto.precio)))

            producto.stock -= cantidad
            detalle = OrdenDetalle(
                orden_id=orden.id,
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario=precio_unitario,
            )
            db.session.add(detalle)

        pago = Pago(
            orden_id=orden.id,
            monto=total,
            metodo=metodo,
            estado="aprobado",
            referencia_externa=referencia,
        )
        db.session.add(pago)

        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return (
        {
            "success": True,
            "orden": {
                "id": orden.codigo,
                "timestamp": _to_iso_utc(orden.created_at),
                "items": validacion["items"],
                "subtotal": float(subtotal),
                "iva": float(iva),
                "total": float(total),
                "estado": orden.estado,
                "metodo": metodo,
                "referencia": referencia,
            },
            "redireccion": {
                "url": f"/confirmacion/{orden.codigo}",
                "mensaje": "Pago exitoso. Tu orden ha sido confirmada.",
            },
        },
        200,
    )


def obtener_orden(codigo_orden: str) -> tuple[dict, int]:
    orden = Orden.query.filter_by(codigo=codigo_orden).first()
    if not orden:
        raise ValidationError(
            f"No existe una orden con id {codigo_orden}.",
            code="ORDER_NOT_FOUND",
            status_code=404,
        )

    items = _construir_detalles_orden(orden)

    return (
        {
            "success": True,
            "orden": {
                "id": orden.codigo,
                "items": items,
                "subtotal": float(_money(Decimal(str(orden.subtotal)))),
                "iva": float(_money(Decimal(str(orden.iva)))),
                "total": float(_money(Decimal(str(orden.total)))),
                "estado": orden.estado,
                "createdAt": _to_iso_utc(orden.created_at),
            },
        },
        200,
    )
