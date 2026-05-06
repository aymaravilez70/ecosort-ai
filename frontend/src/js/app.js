// ===== EcoSort AI — Frontend App =====

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://ecosort-ai-backend.fly.dev';

// ===== STATE =====
let products = JSON.parse(localStorage.getItem('ecosort_products') || '[]');

// ===== DOM ELEMENTS =====
const form = document.getElementById('product-form');
const btnClassify = document.getElementById('btn-classify');
const aiResult = document.getElementById('ai-result');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  updateTable();
  updateHeroStats();
  setupNavigation();
});

// ===== NAVIGATION =====
function setupNavigation() {
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

// ===== FORM SUBMISSION =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const productData = {
    name: document.getElementById('product-name').value,
    category: document.getElementById('product-category').value,
    quantity: parseInt(document.getElementById('product-quantity').value),
    weight_kg: parseFloat(document.getElementById('product-weight').value),
    condition: document.getElementById('product-condition').value,
    expiry_date: document.getElementById('product-expiry').value || null,
    notes: document.getElementById('product-notes').value || ''
  };

  // Show loading state
  btnClassify.disabled = true;
  btnClassify.classList.add('loading');
  btnClassify.innerHTML = '<i class="fas fa-spinner"></i> Clasificando...';
  aiResult.classList.add('hidden');

  try {
    const result = await classifyProduct(productData);
    displayResult(result);
    saveProduct(productData, result);
    form.reset();
  } catch (err) {
    console.error('Error clasificando:', err);
    // Fallback to local classification
    const result = classifyLocally(productData);
    displayResult(result);
    saveProduct(productData, result);
    form.reset();
  } finally {
    btnClassify.disabled = false;
    btnClassify.classList.remove('loading');
    btnClassify.innerHTML = '<i class="fas fa-brain"></i> Clasificar con IA';
  }
});

// ===== API CALL =====
async function classifyProduct(data) {
  const response = await fetch(`${API_URL}/api/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('API error');
  return response.json();
}

// ===== LOCAL CLASSIFICATION (fallback when API unavailable) =====
function classifyLocally(data) {
  const { condition, category, quantity, weight_kg, expiry_date } = data;

  let classification = 'donar';
  let confidence = 85;
  let reasoning = '';
  let logistics = '';
  let savings = '';
  let impact = '';

  const isExpired = expiry_date && new Date(expiry_date) < new Date();
  const isNearExpiry = expiry_date && !isExpired &&
    (new Date(expiry_date) - new Date()) < 30 * 24 * 60 * 60 * 1000;

  if (condition === 'danado' || isExpired) {
    classification = 'reciclar';
    confidence = 92;
    reasoning = `Producto en condicion "${formatCondition(condition)}"${isExpired ? ' y vencido' : ''}. ` +
      `La mejor opcion es reciclar para recuperar materiales y evitar envio a vertedero. ` +
      `Se puede procesar con partners de reciclaje locales.`;
    logistics = 'Recoger y enviar a centro de reciclaje asociado';
    savings = `Ahorro estimado: $${(weight_kg * 0.8).toFixed(0)} USD vs disposicion en vertedero`;
    impact = `${(weight_kg * 0.5).toFixed(1)} kg CO2 evitados por reciclaje`;
  } else if (condition === 'danado-leve' || isNearExpiry) {
    classification = 'liquidar';
    confidence = 88;
    reasoning = `Producto con ${condition === 'danado-leve' ? 'dano leve en empaque' : 'fecha proxima a vencer'}. ` +
      `Aun es vendible a precio reducido. Se recomienda liquidar a traves de canales de descuento ` +
      `para recuperar parte del valor del inventario.`;
    logistics = 'Distribuir a canales de liquidacion o venta con descuento';
    savings = `Recuperacion estimada: $${(quantity * 1.5).toFixed(0)} USD por liquidacion`;
    impact = `${weight_kg.toFixed(1)} kg desviados del vertedero`;
  } else {
    classification = 'donar';
    confidence = 94;
    reasoning = `Producto en ${formatCondition(condition).toLowerCase()}, categoria "${formatCategory(category)}". ` +
      `Ideal para donacion a organizaciones comunitarias. Se maximiza el impacto social ` +
      `y se obtienen beneficios fiscales por donacion.`;
    logistics = 'Coordinar pickup con ONG o banco de alimentos mas cercano';
    savings = `Deduccion fiscal estimada: $${(quantity * 2.2).toFixed(0)} USD`;
    impact = `${weight_kg.toFixed(1)} kg de productos ayudando a comunidades locales`;
  }

  return { classification, confidence, reasoning, logistics, savings, impact };
}

// ===== DISPLAY RESULT =====
function displayResult(result) {
  const badge = document.getElementById('classification-badge');
  badge.textContent = result.classification.toUpperCase();
  badge.className = `classification-badge ${result.classification}`;

  document.getElementById('confidence').textContent = `Confianza: ${result.confidence}%`;
  document.getElementById('ai-reasoning').textContent = result.reasoning;
  document.getElementById('action-logistics').textContent = result.logistics;
  document.getElementById('action-savings').textContent = result.savings;
  document.getElementById('action-impact').textContent = result.impact;

  aiResult.classList.remove('hidden');
  aiResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== SAVE PRODUCT =====
function saveProduct(data, result) {
  const product = {
    ...data,
    classification: result.classification,
    confidence: result.confidence,
    timestamp: new Date().toISOString()
  };

  products.unshift(product);
  localStorage.setItem('ecosort_products', JSON.stringify(products));

  updateDashboard();
  updateTable();
  updateHeroStats();
}

// ===== UPDATE DASHBOARD =====
function updateDashboard() {
  const counts = { donar: 0, reciclar: 0, liquidar: 0, weight: 0 };

  products.forEach(p => {
    if (p.classification === 'donar') counts.donar++;
    else if (p.classification === 'reciclar') counts.reciclar++;
    else if (p.classification === 'liquidar') counts.liquidar++;
    counts.weight += p.weight_kg || 0;
  });

  document.getElementById('dash-donate').textContent = counts.donar;
  document.getElementById('dash-recycle').textContent = counts.reciclar;
  document.getElementById('dash-liquidate').textContent = counts.liquidar;
  document.getElementById('dash-weight').textContent = `${counts.weight.toFixed(1)} kg`;
}

// ===== UPDATE TABLE =====
function updateTable() {
  const tbody = document.getElementById('products-table');

  if (products.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay productos registrados aun. Usa el formulario para comenzar.</td></tr>';
    return;
  }

  tbody.innerHTML = products.slice(0, 10).map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${formatCategory(p.category)}</td>
      <td>${p.quantity}</td>
      <td>${formatCondition(p.condition)}</td>
      <td><span class="badge-small ${p.classification}">${p.classification.toUpperCase()}</span></td>
      <td>${formatDate(p.timestamp)}</td>
    </tr>
  `).join('');
}

// ===== UPDATE HERO STATS =====
function updateHeroStats() {
  const total = products.length;
  const weight = products.reduce((sum, p) => sum + (p.weight_kg || 0), 0);
  const diverted = total > 0 ? Math.round((products.filter(p => p.classification !== 'reciclar').length / total) * 100) : 0;
  const co2 = (weight * 0.45).toFixed(1);

  animateNumber('total-items', total);
  document.getElementById('diverted-pct').textContent = `${diverted}%`;
  document.getElementById('co2-saved').textContent = `${co2} kg`;
}

// ===== HELPERS =====
function formatCategory(cat) {
  const map = {
    alimentos: 'Alimentos', cosmeticos: 'Cosmeticos', limpieza: 'Limpieza',
    electronica: 'Electronica', ropa: 'Ropa/Textiles', farmacia: 'Farmacia',
    hogar: 'Hogar', otro: 'Otro'
  };
  return map[cat] || cat;
}

function formatCondition(cond) {
  const map = {
    nuevo: 'Nuevo', 'buen-estado': 'Buen Estado', 'danado-leve': 'Dano Leve',
    danado: 'Danado', expirado: 'Expirado'
  };
  return map[cond] || cond;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  let start = current;
  const step = Math.max(1, Math.floor((target - start) / 20));
  const interval = setInterval(() => {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(interval);
    }
    el.textContent = start;
  }, 30);
}
