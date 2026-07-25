-- ============================================================
-- CHILAQUILES BAJA - Integración por API con Uber Eats y Didi Food
-- Ejecuta este script en Supabase > SQL Editor
--
-- Es idempotente: se puede correr varias veces sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. GASTOS: llave natural para no duplicar ventas sincronizadas
-- ------------------------------------------------------------
-- `origen_ref` es la llave de idempotencia (p. ej. "uber_eats:2026-07-24").
-- Al ser UNIQUE, re-sincronizar el mismo día ACTUALIZA el renglón en vez de
-- crear uno nuevo. Postgres permite múltiples NULL en una columna UNIQUE, así
-- que los gastos capturados a mano no se ven afectados.

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual';
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS origen_ref TEXT;

-- Ojo: el índice NO puede ser parcial (WHERE origen_ref IS NOT NULL). El upsert
-- de PostgREST emite `ON CONFLICT (origen_ref)` sin cláusula WHERE, y Postgres
-- no infiere índices parciales con esa forma. Un índice único normal ya permite
-- múltiples NULL, que es justo lo que necesitan los gastos capturados a mano.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gastos_origen_ref ON gastos(origen_ref);

-- ------------------------------------------------------------
-- 2. REPORTES_EXTERNOS: resumen por periodo, ahora también desde la API
-- ------------------------------------------------------------

ALTER TABLE reportes_externos ADD COLUMN IF NOT EXISTS impuestos DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE reportes_externos ADD COLUMN IF NOT EXISTS total_pedidos INTEGER DEFAULT 0;
ALTER TABLE reportes_externos ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'MXN';
ALTER TABLE reportes_externos ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'archivo';
ALTER TABLE reportes_externos ADD COLUMN IF NOT EXISTS actualizado_at TIMESTAMPTZ DEFAULT NOW();

-- Un solo resumen por plataforma y periodo: volver a sincronizar lo actualiza.
-- Si ya tienes filas repetidas de cargas manuales previas, este índice falla;
-- en ese caso borra las repetidas (dejando la más reciente) y vuelve a correrlo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reportes_periodo
  ON reportes_externos(plataforma, fecha_inicio, fecha_fin);

-- ------------------------------------------------------------
-- 3. PEDIDOS_DELIVERY: detalle pedido por pedido
-- ------------------------------------------------------------
-- Guardar el detalle permite auditar contra el panel de la plataforma y
-- recalcular el total de un día cuando llega un webhook suelto.

CREATE TABLE IF NOT EXISTS pedidos_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL CHECK (plataforma IN ('uber_eats', 'didi_food')),
  pedido_externo_id TEXT NOT NULL,
  tienda_externa_id TEXT,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'desconocido'
    CHECK (estado IN ('completado', 'cancelado', 'desconocido')),
  ingresos_brutos DECIMAL(12, 2) NOT NULL DEFAULT 0,
  comisiones DECIMAL(12, 2) NOT NULL DEFAULT 0,
  promociones DECIMAL(12, 2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12, 2) NOT NULL DEFAULT 0,
  dinero_neto DECIMAL(12, 2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actualizado_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plataforma, pedido_externo_id)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_delivery_fecha
  ON pedidos_delivery(plataforma, fecha);

-- ------------------------------------------------------------
-- 4. SINCRONIZACIONES_DELIVERY: bitácora de cada corrida
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sincronizaciones_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL CHECK (plataforma IN ('uber_eats', 'didi_food')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('ok', 'error')),
  pedidos_sincronizados INTEGER DEFAULT 0,
  dinero_neto DECIMAL(12, 2) DEFAULT 0,
  mensaje TEXT,
  disparado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sincronizaciones_recientes
  ON sincronizaciones_delivery(plataforma, created_at DESC);

-- ------------------------------------------------------------
-- 5. EVENTOS_DELIVERY: webhooks tal cual llegan
-- ------------------------------------------------------------
-- Se guarda el payload completo para poder reprocesar o auditar. El id externo
-- es único por plataforma para descartar los reintentos duplicados.

CREATE TABLE IF NOT EXISTS eventos_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL CHECK (plataforma IN ('uber_eats', 'didi_food')),
  tipo TEXT NOT NULL,
  evento_externo_id TEXT,
  pedido_externo_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eventos_delivery_externo
  ON eventos_delivery(plataforma, evento_externo_id)
  WHERE evento_externo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_delivery_pedido
  ON eventos_delivery(plataforma, pedido_externo_id);

-- ------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- La escritura la hace el servidor con la service role key, que salta RLS.
-- Estas políticas sólo abren la LECTURA a los socios autenticados; nadie puede
-- escribir desde el navegador.

ALTER TABLE pedidos_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE sincronizaciones_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Socios pueden ver pedidos de delivery" ON pedidos_delivery;
CREATE POLICY "Socios pueden ver pedidos de delivery"
  ON pedidos_delivery FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Socios pueden ver sincronizaciones" ON sincronizaciones_delivery;
CREATE POLICY "Socios pueden ver sincronizaciones"
  ON sincronizaciones_delivery FOR SELECT
  TO authenticated
  USING (true);

-- Los eventos crudos pueden traer datos del cliente final (nombre, dirección),
-- así que NO se exponen al navegador: sólo los lee el servidor.

-- ============================================================
-- LISTO
--
-- Siguiente paso: llenar las variables de entorno (ver .env.example)
-- y entrar a /integraciones para probar la conexión.
-- ============================================================
