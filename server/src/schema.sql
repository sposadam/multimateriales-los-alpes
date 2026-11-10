-- ==========================================================================
-- MultiMateriales Los Alpes — Esquema de base de datos (PostgreSQL)
-- Se ejecuta automáticamente al iniciar el servidor (es idempotente:
-- puede correr varias veces sin borrar datos).
-- ==========================================================================

-- Datos de la empresa (una sola fila)
CREATE TABLE IF NOT EXISTS settings (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name  TEXT NOT NULL DEFAULT 'Bodega Central',
  nit           TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Consecutivos de documentos (ENT-000001, SAL-000001, AJU-000001)
CREATE TABLE IF NOT EXISTS doc_counters (
  type         TEXT PRIMARY KEY CHECK (type IN ('entrada', 'salida', 'ajuste')),
  last_number  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO doc_counters (type) VALUES ('entrada'), ('salida'), ('ajuste') ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS categories (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  color  TEXT NOT NULL DEFAULT '#64748b',
  icon   TEXT NOT NULL DEFAULT 'otros'
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_uq ON categories (lower(name));

CREATE TABLE IF NOT EXISTS suppliers (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  nit      TEXT NOT NULL DEFAULT '',
  contact  TEXT NOT NULL DEFAULT '',
  phone    TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL DEFAULT '',
  address  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  sku          TEXT NOT NULL,
  name         TEXT NOT NULL,
  brand        TEXT NOT NULL DEFAULT '',
  category_id  TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  supplier_id  TEXT REFERENCES suppliers (id) ON DELETE RESTRICT,
  unit         TEXT NOT NULL,
  stock        NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock    NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  max_stock    NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (max_stock >= 0),
  cost         NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  price        NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  location     TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  image        TEXT,
  expiry_date  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uq ON products (upper(sku));
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

-- Movimientos de inventario (kardex). Guardan copia del nombre/código del
-- producto para conservar la historia aunque el producto se elimine.
CREATE TABLE IF NOT EXISTS movements (
  seq             BIGSERIAL,              -- orden de inserción (líneas de un documento)
  id              TEXT PRIMARY KEY,
  doc_id          TEXT NOT NULL,
  doc_number      TEXT NOT NULL,
  batch_id        TEXT,
  product_id      TEXT REFERENCES products (id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  sku             TEXT NOT NULL,
  unit            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
  quantity        NUMERIC(14, 3) NOT NULL,
  previous_stock  NUMERIC(14, 3) NOT NULL,
  new_stock       NUMERIC(14, 3) NOT NULL CHECK (new_stock >= 0),
  unit_cost       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reason          TEXT NOT NULL DEFAULT '',
  destination     TEXT NOT NULL DEFAULT '',
  received_by     TEXT NOT NULL DEFAULT '',
  received_by_id  TEXT NOT NULL DEFAULT '',
  vehicle         TEXT NOT NULL DEFAULT '',
  supplier_id     TEXT REFERENCES suppliers (id) ON DELETE SET NULL,
  reference       TEXT NOT NULL DEFAULT '',
  responsible     TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  expiry_date     DATE,
  "date"          TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movements_product_idx ON movements (product_id);
CREATE INDEX IF NOT EXISTS movements_doc_idx ON movements (doc_id);
CREATE INDEX IF NOT EXISTS movements_date_idx ON movements ("date" DESC);
