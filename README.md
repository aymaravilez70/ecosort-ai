# EcoSort AI - Clasificador Inteligente de Productos Excedentes

Sistema de clasificacion automatizada de productos excedentes usando IA. Determina si un producto debe ser **donado**, **reciclado** o **liquidado**, optimizando el desvio de residuos y maximizando el impacto social y ambiental.

## Stack Tecnologico

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla) — Deploy en Netlify
- **Backend:** Python, FastAPI — API REST de clasificacion
- **Automatizacion:** n8n workflows (webhook → IA → Airtable → Slack)
- **Base de datos:** Airtable (via API)
- **Notificaciones:** Slack (via n8n)
- **IA:** Motor de clasificacion basado en reglas + extensible a GPT/Claude

## Arquitectura

```
[Formulario Web] → [Webhook n8n] → [FastAPI - Clasificacion IA]
                                         ↓
                                 [Airtable - Almacenamiento]
                                         ↓
                                 [Slack - Notificacion]
```

## Instalacion y Setup

### Frontend

```bash
cd frontend
# Abrir index.html directamente o servir con cualquier servidor local
python3 -m http.server 3000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### n8n Workflow

1. Importar `n8n/ecosort-workflow.json` en tu instancia de n8n
2. Configurar credenciales de Airtable y Slack
3. Activar el workflow

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/` | Info de la API |
| GET | `/health` | Health check |
| POST | `/api/classify` | Clasificar un producto |
| GET | `/api/products` | Listar productos clasificados |
| GET | `/api/stats` | Estadisticas agregadas |
| POST | `/api/webhook/n8n` | Webhook para integracion n8n |

## Ejemplo de Request

```json
POST /api/classify
{
  "name": "Vitaminas multivitaminicas",
  "category": "farmacia",
  "quantity": 500,
  "weight_kg": 120,
  "condition": "nuevo",
  "expiry_date": "2025-12-01",
  "notes": "Inventario excedente de temporada"
}
```

## Construido por

**Aymar Aviles** — [Portfolio](https://aymaraviles.vercel.app) | [GitHub](https://github.com/aymaravilez70)
