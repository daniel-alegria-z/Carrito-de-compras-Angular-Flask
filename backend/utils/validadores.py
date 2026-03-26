class ValidationError(Exception):
    def __init__(self, message: str, code: str = "VALIDATION_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def validar_items_payload(payload) -> list[dict]:
    # Valida estructura minima del body y normaliza items a un shape consistente.
    if not isinstance(payload, dict):
        raise ValidationError("El cuerpo de la solicitud debe ser un objeto JSON.")

    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise ValidationError(
            "Debes enviar un arreglo 'items' con al menos un producto.",
            code="INVALID_ITEMS",
        )

    normalizados: list[dict] = []

    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValidationError(
                f"El item #{index} debe ser un objeto.", code="INVALID_ITEM_FORMAT"
            )

        product_id = item.get("id")
        cantidad = item.get("cantidad")

        if not isinstance(product_id, int) or product_id <= 0:
            raise ValidationError(
                f"El item #{index} tiene un id invalido.", code="INVALID_PRODUCT_ID"
            )

        if not isinstance(cantidad, int) or cantidad <= 0:
            raise ValidationError(
                f"El item #{index} tiene una cantidad invalida.",
                code="INVALID_QUANTITY",
            )

        normalizados.append({"id": product_id, "cantidad": cantidad})

    return normalizados


def validar_pago_payload(payload) -> tuple[str, dict]:
    # Valida metodo y datos del cliente para evitar pagos con datos incompletos.
    if not isinstance(payload, dict):
        raise ValidationError("El cuerpo de la solicitud debe ser un objeto JSON.")

    metodo = payload.get("metodo")
    metodos_validos = {"tarjeta", "transferencia"}
    if metodo not in metodos_validos:
        raise ValidationError(
            "El metodo de pago es invalido. Usa 'tarjeta' o 'transferencia'.",
            code="INVALID_PAYMENT_METHOD",
            status_code=400,
        )

    datos_usuario = payload.get("datosUsuario")
    if not isinstance(datos_usuario, dict):
        raise ValidationError(
            "Debes enviar el objeto 'datosUsuario'.",
            code="INVALID_USER_DATA",
            status_code=400,
        )

    nombre = datos_usuario.get("nombre")
    email = datos_usuario.get("email")

    if not isinstance(nombre, str) or not nombre.strip():
        raise ValidationError(
            "El campo datosUsuario.nombre es obligatorio.",
            code="INVALID_USER_NAME",
            status_code=400,
        )

    if not isinstance(email, str) or not email.strip() or "@" not in email:
        raise ValidationError(
            "El campo datosUsuario.email es invalido.",
            code="INVALID_USER_EMAIL",
            status_code=400,
        )

    usuario = {
        "nombre": nombre.strip(),
        "email": email.strip(),
    }

    return metodo, usuario
