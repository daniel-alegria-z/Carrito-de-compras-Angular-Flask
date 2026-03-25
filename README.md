# Carrito Avengers (Angular + Flask)

Aplicacion full-stack de carrito de compras con tematica Avengers.

El proyecto incluye:
- Frontend en Angular para catalogo, carrito, checkout y confirmacion.
- Backend en Flask con API REST para productos, validacion de carrito y simulacion de pasarela de pagos.
- Persistencia local con SQLite para productos, ordenes y pagos.

## Contenido

- Descripcion funcional
- Stack tecnologico
- Arquitectura general
- Requisitos previos
- Instalacion y ejecucion local
- Variables de entorno
- Endpoints API
- Flujo de compra
- Estructura del proyecto
- Scripts utiles
- Troubleshooting
- Estado actual y siguientes mejoras

## Descripcion funcional

Flujo principal de usuario:
1. Ver catalogo de productos.
2. Agregar productos al carrito.
3. Ajustar cantidades y revisar resumen.
4. Ir a checkout y validar totales con backend.
5. Procesar pago (pasarela simulada).
6. Ver confirmacion de orden con detalle.

Reglas de negocio implementadas:
- Validacion de stock en servidor.
- Calculo server-side de subtotal, IVA (19%) y total.
- Simulacion de pagos (90% exito, 10% rechazo).
- Creacion de orden y pago en base de datos.
- Descuento de inventario solo en pagos aprobados.

## Stack tecnologico

### Frontend
- Angular 20
- TypeScript
- RxJS
- Standalone Components

### Backend
- Flask 2.3
- Flask-SQLAlchemy
- Flask-CORS
- SQLite
- Python 3.10+

## Arquitectura general

- `src/`: interfaz Angular.
- `backend/`: API Flask y logica de dominio.

Integracion actual:
- El frontend consume API en `http://127.0.0.1:5000/api`.
- La base de datos se crea en `backend/carrito.db` (archivo local, no versionado).

## Requisitos previos

- Node.js 18+ (recomendado 20+)
- npm 9+
- Python 3.10+
- pip
- PowerShell o terminal compatible

## Instalacion y ejecucion local

### 1) Clonar e instalar frontend

```bash
npm install
```

### 2) Crear y activar entorno virtual de Python

En Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Si PowerShell bloquea scripts:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 3) Instalar dependencias backend

```bash
pip install -r backend/requirements.txt
```

### 4) Inicializar base de datos y seed

```bash
python -m flask --app backend.app init-db
python -m flask --app backend.app seed
```

### 5) Levantar backend (Terminal 1)

```bash
python -m flask --app backend.app run --port 5000
```

Backend disponible en:
- `http://127.0.0.1:5000`

### 6) Levantar frontend (Terminal 2)

```bash
npm start
```

Frontend disponible en:
- `http://localhost:4200`

## Variables de entorno

Archivo de ejemplo:

```env
FLASK_APP=backend.app
FLASK_ENV=development
SECRET_KEY=change-me
CORS_ORIGINS=http://localhost:4200
DATABASE_URL=
```

Notas:
- Si `DATABASE_URL` esta vacio, se usa SQLite local en `backend/carrito.db`.
- `CORS_ORIGINS` acepta multiples origenes separados por coma.

## Endpoints API

Base URL: `http://127.0.0.1:5000/api`

### Salud

- `GET /health`

Respuesta esperada:

```json
{
	"success": true,
	"message": "Backend running"
}
```

### Productos

- `GET /productos`

Retorna lista de productos con stock actual.

### Carrito

- `POST /carrito/validar`

Request:

```json
{
	"items": [
		{ "id": 1, "cantidad": 2 },
		{ "id": 4, "cantidad": 1 }
	]
}
```

Response (ejemplo):

```json
{
	"success": true,
	"carrito": {
		"items": [
			{
				"id": 1,
				"nombre": "Figura de Accion Iron Man",
				"precio": 19.99,
				"cantidad": 2,
				"subtotal": 39.98
			}
		],
		"subtotal": 69.88,
		"iva": 13.28,
		"descuentoPrimeraCompra": 0.0,
		"total": 83.16
	}
}
```

### Pagos

- `POST /pagar`

Request:

```json
{
	"items": [
		{ "id": 1, "cantidad": 1 },
		{ "id": 2, "cantidad": 1 }
	],
	"metodo": "tarjeta",
	"datosUsuario": {
		"nombre": "Dania Test",
		"email": "dania@test.com"
	}
}
```

Response exito (200):

```json
{
	"success": true,
	"orden": {
		"id": "ORD-20260325-002",
		"timestamp": "2026-03-25T21:56:21.790481Z",
		"subtotal": 37.49,
		"iva": 7.12,
		"total": 44.61,
		"estado": "confirmado",
		"metodo": "tarjeta",
		"referencia": "REF-PAY-20260325-PJVKDK"
	},
	"redireccion": {
		"url": "/confirmacion/ORD-20260325-002",
		"mensaje": "Pago exitoso. Tu orden ha sido confirmada."
	}
}
```

Response rechazo (402):

```json
{
	"success": false,
	"error": "Pago rechazado por pasarela",
	"code": "PAYMENT_DECLINED",
	"motivo": "Fondos insuficientes",
	"orden_id": null
}
```

### Orden

- `GET /orden/{codigo_orden}`

Response (ejemplo):

```json
{
	"success": true,
	"orden": {
		"id": "ORD-20260325-002",
		"items": [
			{
				"id": 1,
				"nombre": "Figura de Accion Iron Man",
				"cantidad": 1,
				"precio": 19.99,
				"subtotal": 19.99
			}
		],
		"subtotal": 37.49,
		"iva": 7.12,
		"total": 44.61,
		"estado": "confirmado",
		"createdAt": "2026-03-25T21:56:21.790481Z"
	}
}
```

## Flujo de compra

1. Catalogo carga productos desde backend.
2. Usuario arma carrito en frontend.
3. Checkout valida carrito en servidor.
4. Usuario confirma pago con metodo y datos.
5. Backend simula pasarela:
	 - Si aprueba: crea orden, crea pago, descuenta stock.
	 - Si rechaza: responde motivo, no modifica stock.
6. Frontend redirige a pantalla de confirmacion y consulta orden por id.

## Estructura del proyecto

```text
carrito-angular/
	backend/
		app.py
		config.py
		models.py
		seed.py
		requirements.txt
		routes/
			productos.py
			carrito.py
			pagos.py
		services/
			carrito_validacion_service.py
			pago_service.py
		utils/
			validadores.py
			logger.py
	src/
		app/
			components/
				catalogo/
				carrito/
				checkout/
			core/
				modelo/
				services/
```

## Scripts utiles

### Frontend

```bash
npm start
npm run build
npm test
```

### Backend

```bash
python -m flask --app backend.app init-db
python -m flask --app backend.app seed
python -m flask --app backend.app run --port 5000
```

## Troubleshooting

### Error: no such table: producto

Ejecuta:

```bash
python -m flask --app backend.app init-db
python -m flask --app backend.app seed
```

### Error de CORS en frontend

Verifica `CORS_ORIGINS` en backend y que incluya `http://localhost:4200`.

### Error por entorno Python no activo

Asegurate de activar `.venv` antes de usar comandos de Flask.

## Estado actual y siguientes mejoras

Estado actual:
- MVP funcional frontend + backend.
- API validada manualmente con Insomnia.
- Checkout y confirmacion conectados a backend.

Mejoras recomendadas:
- Configuracion de URL API por ambientes (dev/prod).
- Autenticacion de usuarios.
- Integracion de pasarela real (Stripe/Mercado Pago).
- Pruebas automatizadas backend (pytest) y e2e frontend.
- Pipeline CI para build y checks.

## Autoria

**Daniel Esteban Alegria Zamora**  
Software Developer  
Contacto: daniel.alegria.z@outlook.com  
LinkedIn: https://www.linkedin.com/in/daniel-esteban-a-52b6752a0/

Contexto del proyecto: proyecto personal.

---

Proyecto desarrollado con enfoque academico/practico para demostrar arquitectura full-stack, validaciones server-side y flujo de compra end-to-end.
