/**
 * seed.js — Datos de ejemplo (ficticios) para demostraciones.
 * Se cargan al iniciar si la base de datos está vacía y SEED_DEMO=true.
 */
'use strict';

const { docNumber } = require('./domain');

const DAY = 864e5;

const CATEGORIES = [
  { id: 'cat_cemento', name: 'Cementos y morteros', icon: 'cemento', color: '#78716c' },
  { id: 'cat_acero', name: 'Acero y mallas', icon: 'acero', color: '#3b6ea5' },
  { id: 'cat_agregados', name: 'Agregados', icon: 'agregados', color: '#b7791f' },
  { id: 'cat_ladrillos', name: 'Ladrillos y bloques', icon: 'ladrillos', color: '#c2532d' },
  { id: 'cat_madera', name: 'Madera y formaleta', icon: 'madera', color: '#8b5a2b' },
  { id: 'cat_plomeria', name: 'Plomería', icon: 'plomeria', color: '#0e7490' },
  { id: 'cat_electrico', name: 'Material eléctrico', icon: 'electrico', color: '#a16207' },
  { id: 'cat_pinturas', name: 'Pinturas e impermeabilizantes', icon: 'pinturas', color: '#7c3aed' },
  { id: 'cat_herramientas', name: 'Herramientas', icon: 'herramientas', color: '#b91c1c' },
  { id: 'cat_ferreteria', name: 'Ferretería y tornillería', icon: 'ferreteria', color: '#4b5563' }
];

const SUPPLIERS = [
  { id: 'sup_1', name: 'Distribuidora de Cementos del Centro', nit: '900.123.456-1', contact: 'Laura Méndez', phone: '601 555 0101', email: 'ventas@cementoscentro.example', address: 'Zona Industrial, Bodega 4' },
  { id: 'sup_2', name: 'Aceros y Mallas del Valle', nit: '900.234.567-2', contact: 'Andrés Rojas', phone: '602 555 0202', email: 'pedidos@acerosvalle.example', address: 'Calle 15 # 32-10' },
  { id: 'sup_3', name: 'Agregados La Cantera', nit: '900.345.678-3', contact: 'Martha Ruiz', phone: '310 555 0303', email: 'despachos@lacantera.example', address: 'Km 7 vía al río' },
  { id: 'sup_4', name: 'Ferretería El Constructor', nit: '900.456.789-4', contact: 'Jorge Castillo', phone: '315 555 0404', email: 'contacto@elconstructor.example', address: 'Carrera 8 # 20-45' },
  { id: 'sup_5', name: 'Maderas San José', nit: '900.567.890-5', contact: 'Esteban López', phone: '320 555 0505', email: 'ventas@maderassanjose.example', address: 'Avenida 30 # 5-60' },
  { id: 'sup_6', name: 'Eléctricos y Tuberías del Norte', nit: '900.678.901-6', contact: 'Paola Herrera', phone: '604 555 0606', email: 'comercial@etnorte.example', address: 'Calle 50 # 70-12' }
];

// [sku, nombre, categoría, unidad, stock, mín, máx, costo, precio, ubicación, proveedor, marca, días a vencer, descripción]
const PRODUCTS = [
  ['CEM-001', 'Cemento gris uso general 50 kg', 'cat_cemento', 'Bulto', 120, 40, 300, 32000, 36500, 'Zona A · Estiba 01', 'sup_1', 'Andino', 75, 'Cemento Portland tipo UG. Almacenar sobre estibas, lejos de la humedad.'],
  ['CEM-002', 'Mortero de pega 40 kg', 'cat_cemento', 'Bulto', 35, 20, 120, 21000, 24500, 'Zona A · Estiba 02', 'sup_1', 'Pegamax', 110, 'Mortero seco listo para mampostería.'],
  ['CEM-003', 'Cemento blanco 25 kg', 'cat_cemento', 'Bulto', 8, 10, 40, 38000, 44000, 'Zona A · Estiba 03', 'sup_1', 'Andino', 18, ''],
  ['ACE-001', 'Varilla corrugada 3/8" x 6 m', 'cat_acero', 'Varilla', 450, 150, 900, 14500, 16800, 'Patio · Rack 1', 'sup_2', 'Acerías del Valle', 0, 'Acero de refuerzo grado 60.'],
  ['ACE-002', 'Varilla corrugada 1/2" x 6 m', 'cat_acero', 'Varilla', 280, 100, 600, 25500, 29000, 'Patio · Rack 1', 'sup_2', 'Acerías del Valle', 0, 'Acero de refuerzo grado 60.'],
  ['ACE-003', 'Malla electrosoldada 15x15 cm', 'cat_acero', 'Lámina', 0, 10, 60, 185000, 210000, 'Patio · Rack 2', 'sup_2', 'Acerías del Valle', 0, 'Lámina de 2,35 x 6 m.'],
  ['ACE-004', 'Alambre negro calibre 18', 'cat_acero', 'Kg', 60, 25, 150, 8500, 10000, 'Zona B · Estante 03', 'sup_2', 'Trefilados Sur', 0, 'Para amarre de acero.'],
  ['AGR-001', 'Arena de río lavada', 'cat_agregados', 'm³', 18, 10, 40, 85000, 98000, 'Patio · Silo 1', 'sup_3', 'La Cantera', 0, ''],
  ['AGR-002', 'Grava triturada 3/4"', 'cat_agregados', 'm³', 6, 8, 30, 95000, 110000, 'Patio · Silo 2', 'sup_3', 'La Cantera', 0, ''],
  ['LAD-001', 'Ladrillo tolete común', 'cat_ladrillos', 'Unidad', 4200, 1500, 8000, 850, 1000, 'Patio · Zona C', 'sup_4', 'Ladrillera Alpes', 0, ''],
  ['LAD-002', 'Bloque de concreto 15x20x40 cm', 'cat_ladrillos', 'Unidad', 900, 500, 3000, 3200, 3800, 'Patio · Zona C', 'sup_4', 'Bloquera Norte', 0, ''],
  ['MAD-001', 'Tabla formaleta 2,9 m', 'cat_madera', 'Unidad', 150, 60, 400, 12000, 14500, 'Zona D · Arrume 1', 'sup_5', 'Maderas San José', 0, ''],
  ['MAD-002', 'Listón de pino 2x2" x 3 m', 'cat_madera', 'Unidad', 40, 50, 200, 9500, 11500, 'Zona D · Arrume 2', 'sup_5', 'Maderas San José', 0, ''],
  ['PLO-001', 'Tubo PVC presión 1/2" x 6 m', 'cat_plomeria', 'Unidad', 85, 30, 200, 14000, 16500, 'Zona B · Estante 01', 'sup_6', 'Tubopak', 0, ''],
  ['PLO-002', 'Tubo PVC sanitario 4" x 6 m', 'cat_plomeria', 'Unidad', 22, 15, 60, 68000, 78000, 'Zona B · Estante 01', 'sup_6', 'Tubopak', 0, ''],
  ['ELE-001', 'Cable THHN calibre 12 (rollo 100 m)', 'cat_electrico', 'Rollo', 14, 5, 30, 285000, 320000, 'Zona B · Estante 05', 'sup_6', 'Conducel', 0, 'Cable de cobre, aislamiento THHN/THWN.'],
  ['ELE-002', 'Tubo conduit PVC 1/2" x 3 m', 'cat_electrico', 'Unidad', 120, 40, 300, 4200, 5200, 'Zona B · Estante 05', 'sup_6', 'Tubopak', 0, ''],
  ['PIN-001', 'Pintura vinilo blanco tipo 1', 'cat_pinturas', 'Galón', 30, 12, 80, 62000, 72000, 'Zona E · Estante 01', 'sup_4', 'Colorfin', 400, ''],
  ['PIN-002', 'Impermeabilizante acrílico para techos', 'cat_pinturas', 'Galón', 4, 6, 30, 95000, 112000, 'Zona E · Estante 02', 'sup_4', 'Sellatec', 22, ''],
  ['HER-001', 'Carretilla buggy reforzada', 'cat_herramientas', 'Unidad', 6, 2, 12, 245000, 0, 'Zona F · Herramientas', 'sup_4', 'Ruedamax', 0, 'Herramienta de uso interno: registrar préstamos como salida.'],
  ['HER-002', 'Pala cuadrada con mango', 'cat_herramientas', 'Unidad', 18, 6, 40, 32000, 0, 'Zona F · Herramientas', 'sup_4', 'Forja Pro', 0, ''],
  ['FER-001', 'Puntilla 2" con cabeza', 'cat_ferreteria', 'Kg', 45, 20, 120, 7800, 9500, 'Zona B · Estante 04', 'sup_4', 'Clavos Andes', 0, ''],
  ['FER-002', 'Tornillo drywall 6x1" (caja x 1000)', 'cat_ferreteria', 'Caja', 12, 4, 30, 42000, 50000, 'Zona B · Estante 04', 'sup_4', 'Fijamax', 0, '']
];

const PEOPLE = ['Carlos Gómez', 'Ana Rodríguez', 'Jhon Pérez'];
const SITES = ['Obra Torre Norte', 'Conjunto Los Pinos', 'Remodelación Sede Centro', 'Obra Puente Vehicular'];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateOnly(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const idFor = (sku) => 'prd_' + sku.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Genera el conjunto de datos de ejemplo con historial de movimientos coherente. */
function create(now) {
  now = now || Date.now();
  const iso = (t) => new Date(t).toISOString();
  const rand = mulberry32(20261108);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const products = [];
  const movements = [];
  let refNo = 1040;

  PRODUCTS.forEach((row) => {
    const [sku, name, categoryId, unit, stock, minStock, maxStock, cost, price, location, supplierId, brand, expDays, description] = row;
    const product = {
      id: idFor(sku), sku, name, brand, categoryId, supplierId, unit, stock, minStock, maxStock, cost, price,
      location, description, image: null,
      expiryDate: stock > 0 && expDays ? dateOnly(now + expDays * DAY) : null,
      createdAt: iso(now - 30 * DAY),
      updatedAt: iso(now - DAY)
    };
    products.push(product);

    // Historial construido "hacia atrás" desde el stock actual: el kardex cuadra y nunca es negativo.
    const n = 3 + Math.floor(rand() * 4);
    const base = Math.max(1, minStock * 0.6);
    const times = Array.from({ length: n }, () => now - Math.floor(rand() * 27 * DAY) - 2 * 3600e3).sort((a, b) => b - a);
    const events = [];
    let running = stock;
    times.forEach((t) => {
      let type = rand() < 0.66 ? 'salida' : 'entrada';
      const q = Math.max(1, Math.round(base * (0.3 + rand() * 0.9)));
      if (type === 'entrada' && running - q < 0) type = 'salida';
      const after = running;
      const before = type === 'salida' ? running + q : running - q;
      events.push({ t, type, q, before, after });
      running = before;
    });

    const mk = (data) => Object.assign({
      id: 'mov_' + (movements.length + 1).toString(36) + '_' + product.id.slice(4),
      batchId: null, productId: product.id, productName: name, sku, unit, unitCost: cost,
      supplierId: null, destination: '', receivedBy: '', receivedById: '', vehicle: '', notes: '', expiryDate: null
    }, data);

    if (running > 0) {
      movements.push(mk({
        type: 'entrada', quantity: running, previousStock: 0, newStock: running,
        reason: 'Inventario inicial', reference: 'INV-INICIAL', responsible: PEOPLE[0],
        date: iso(now - 30 * DAY), createdAt: iso(now - 30 * DAY)
      }));
    }
    events.reverse().forEach((e) => {
      const isOut = e.type === 'salida';
      const reason = isOut ? pick(['Despacho a obra', 'Despacho a obra', 'Despacho a obra', 'Venta', 'Uso interno / consumo']) : 'Compra a proveedor';
      movements.push(mk({
        type: e.type, quantity: e.q, previousStock: e.before, newStock: e.after, reason,
        destination: reason === 'Despacho a obra' ? pick(SITES) : '',
        supplierId: isOut ? null : supplierId,
        reference: (isOut ? 'REM-' : 'FAC-') + (refNo++),
        responsible: pick(PEOPLE), date: iso(e.t), createdAt: iso(e.t)
      }));
    });
  });

  // Consecutivos de documento en orden cronológico.
  const counters = { entrada: 0, salida: 0, ajuste: 0 };
  movements.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((m) => {
    counters[m.type] += 1;
    m.docId = 'doc_' + m.id.slice(4);
    m.docNumber = docNumber(m.type, counters[m.type]);
  });

  return {
    categories: JSON.parse(JSON.stringify(CATEGORIES)),
    suppliers: JSON.parse(JSON.stringify(SUPPLIERS)),
    products,
    movements,
    counters
  };
}

module.exports = { create, CATEGORIES };
