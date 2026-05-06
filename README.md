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

### n8n (Automatizacion)

**Instalar n8n en tu maquina:**

```bash
# Opcion 1: npm (requiere Node.js 18+)
npm install -g n8n
n8n start

# Opcion 2: Docker
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

**Configurar el workflow:**

1. Abre n8n en `http://localhost:5678`
2. Crea una cuenta (primera vez)
3. Ve a **Workflows** → menu (⋯) → **Import from file**
4. Selecciona el archivo `n8n/ecosort-workflow.json`
5. Verifica que el nodo "API - Clasificar con IA" apunte a `http://127.0.0.1:8000/api/webhook/n8n`
6. Click **Publish** para activar el webhook

**Flujo del workflow:**
```
POST al webhook → n8n envia datos al backend → Backend clasifica → n8n devuelve resultado
```

### Conectar Frontend a n8n

En `frontend/src/js/app.js` puedes configurar:

```javascript
// URL del webhook de n8n
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/ecosort-classify';

// Modo: 'n8n' (via n8n) o 'direct' (directo al backend)
const CLASSIFY_MODE = 'n8n';
```

Cuando `CLASSIFY_MODE = 'n8n'`, el formulario envia los datos al webhook de n8n, que ejecuta el workflow completo. Si n8n no esta disponible, hace fallback a clasificacion local.

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
