"""EcoSort AI — Backend API for intelligent surplus product classification."""

import os
import json
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="EcoSort AI API",
    description="API de clasificacion inteligente de productos excedentes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== MODELS =====

class ProductInput(BaseModel):
    name: str
    category: str
    quantity: int
    weight_kg: float
    condition: str
    expiry_date: Optional[str] = None
    notes: str = ""


class ClassificationResult(BaseModel):
    classification: str
    confidence: int
    reasoning: str
    logistics: str
    savings: str
    impact: str


# ===== IN-MEMORY STORE =====
products_store: list[dict] = []


# ===== CLASSIFICATION ENGINE =====

def classify_product(data: ProductInput) -> ClassificationResult:
    """Classify a surplus product using rule-based AI logic.

    When OPENAI_API_KEY is available, this can be extended to use GPT/Claude
    for more nuanced classification. The current implementation uses a
    deterministic decision tree that mirrors what an LLM would produce.
    """
    condition = data.condition
    category = data.category
    quantity = data.quantity
    weight_kg = data.weight_kg

    is_expired = False
    is_near_expiry = False

    if data.expiry_date:
        try:
            exp = date.fromisoformat(data.expiry_date)
            today = date.today()
            is_expired = exp < today
            is_near_expiry = not is_expired and (exp - today).days < 30
        except ValueError:
            pass

    # Decision logic
    if condition == "danado" or is_expired:
        return ClassificationResult(
            classification="reciclar",
            confidence=92,
            reasoning=(
                f"Producto '{data.name}' en condicion "
                f"{'danado' if condition == 'danado' else 'vencido'}. "
                f"No apto para donacion ni venta. Se recomienda reciclar para "
                f"recuperar materiales y evitar disposicion en vertedero. "
                f"Categoria '{category}' tiene partners de reciclaje disponibles."
            ),
            logistics="Coordinar recoleccion con centro de reciclaje asociado mas cercano",
            savings=f"Ahorro estimado: ${weight_kg * 0.8:.0f} USD vs disposicion en vertedero",
            impact=f"{weight_kg * 0.5:.1f} kg CO2 evitados por reciclaje de materiales",
        )
    elif condition == "danado-leve" or is_near_expiry:
        return ClassificationResult(
            classification="liquidar",
            confidence=88,
            reasoning=(
                f"Producto '{data.name}' con "
                f"{'empaque levemente danado' if condition == 'danado-leve' else 'fecha proxima a vencer'}. "
                f"Aun es comercializable a precio reducido. Liquidar a traves de canales "
                f"de descuento permite recuperar valor del inventario y evitar desperdicio."
            ),
            logistics="Distribuir a canales de liquidacion, outlets o venta con descuento",
            savings=f"Recuperacion estimada: ${quantity * 1.5:.0f} USD por liquidacion",
            impact=f"{weight_kg:.1f} kg de producto desviados del vertedero",
        )
    else:
        return ClassificationResult(
            classification="donar",
            confidence=94,
            reasoning=(
                f"Producto '{data.name}' en buen estado, categoria '{category}'. "
                f"Cumple requisitos para donacion a organizaciones comunitarias. "
                f"Se maximiza el impacto social y se generan beneficios fiscales "
                f"por donacion de {quantity} unidades ({weight_kg} kg)."
            ),
            logistics="Coordinar pickup con ONG o banco de alimentos mas cercano",
            savings=f"Deduccion fiscal estimada: ${quantity * 2.2:.0f} USD",
            impact=f"{weight_kg:.1f} kg de productos beneficiando a comunidades locales",
        )


# ===== ROUTES =====

@app.get("/")
def root():
    return {
        "app": "EcoSort AI",
        "version": "1.0.0",
        "status": "running",
        "endpoints": ["/api/classify", "/api/products", "/api/stats", "/health"],
    }


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/classify", response_model=ClassificationResult)
def classify(product: ProductInput):
    """Classify a surplus product and store the result."""
    result = classify_product(product)

    record = {
        **product.model_dump(),
        "classification": result.classification,
        "confidence": result.confidence,
        "timestamp": datetime.utcnow().isoformat(),
    }
    products_store.insert(0, record)

    return result


@app.get("/api/products")
def get_products(limit: int = 20):
    """Get recently classified products."""
    return products_store[:limit]


@app.get("/api/stats")
def get_stats():
    """Get aggregated classification statistics."""
    counts = {"donar": 0, "reciclar": 0, "liquidar": 0}
    total_weight = 0.0
    total_quantity = 0

    for p in products_store:
        cls = p.get("classification", "")
        if cls in counts:
            counts[cls] += 1
        total_weight += p.get("weight_kg", 0)
        total_quantity += p.get("quantity", 0)

    total = len(products_store)
    diverted_pct = round((counts["donar"] + counts["liquidar"]) / total * 100) if total > 0 else 0

    return {
        "total_products": total,
        "classifications": counts,
        "total_weight_kg": round(total_weight, 1),
        "total_quantity": total_quantity,
        "diverted_pct": diverted_pct,
        "co2_saved_kg": round(total_weight * 0.45, 1),
    }


# ===== WEBHOOK (for n8n integration) =====

@app.post("/api/webhook/n8n")
def n8n_webhook(product: ProductInput):
    """Webhook endpoint for n8n workflow integration.

    n8n sends product data here, receives classification result back.
    The result can then be forwarded to Airtable and Slack via n8n nodes.
    """
    result = classify_product(product)

    record = {
        **product.model_dump(),
        "classification": result.classification,
        "confidence": result.confidence,
        "reasoning": result.reasoning,
        "logistics": result.logistics,
        "savings": result.savings,
        "impact": result.impact,
        "timestamp": datetime.utcnow().isoformat(),
    }
    products_store.insert(0, record)

    return {
        "status": "classified",
        "product": product.name,
        "result": result.model_dump(),
        "airtable_ready": record,
        "slack_message": (
            f":recycle: *Nuevo producto clasificado*\n"
            f"*Producto:* {product.name}\n"
            f"*Clasificacion:* {result.classification.upper()} "
            f"(confianza: {result.confidence}%)\n"
            f"*Razon:* {result.reasoning}\n"
            f"*Peso:* {product.weight_kg} kg | *Cantidad:* {product.quantity}"
        ),
    }
