from datetime import datetime, timezone

from backend.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class Producto(db.Model):
    # Catalogo e inventario disponible para compra.
    __tablename__ = "producto"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    imagen = db.Column(db.String(255), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "precio": float(self.precio),
            "imagen": self.imagen,
            "stock": self.stock,
        }


class Orden(db.Model):
    # Cabecera de compra confirmada.
    __tablename__ = "orden"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(40), unique=True, nullable=True)
    usuario_nombre = db.Column(db.String(120), nullable=True)
    usuario_email = db.Column(db.String(120), nullable=True)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    iva = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    estado = db.Column(db.String(30), nullable=False, default="pendiente")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    detalles = db.relationship(
        "OrdenDetalle", back_populates="orden", cascade="all, delete-orphan"
    )
    pagos = db.relationship("Pago", back_populates="orden", cascade="all, delete-orphan")


class OrdenDetalle(db.Model):
    # Lineas de productos comprados por cada orden.
    __tablename__ = "orden_detalle"

    id = db.Column(db.Integer, primary_key=True)
    orden_id = db.Column(db.Integer, db.ForeignKey("orden.id"), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey("producto.id"), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)

    orden = db.relationship("Orden", back_populates="detalles")
    producto = db.relationship("Producto")


class Pago(db.Model):
    # Resultado del intento de cobro asociado a una orden.
    __tablename__ = "pago"

    id = db.Column(db.Integer, primary_key=True)
    orden_id = db.Column(db.Integer, db.ForeignKey("orden.id"), nullable=False)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    metodo = db.Column(db.String(30), nullable=False)
    estado = db.Column(db.String(30), nullable=False, default="pendiente")
    referencia_externa = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    orden = db.relationship("Orden", back_populates="pagos")
