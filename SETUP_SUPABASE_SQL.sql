-- ========================================
-- CHILAQUILES BAJA - Setup SQL Script
-- Ejecuta esto en Supabase SQL Editor
-- ========================================

-- 1. Tabla de GASTOS
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('fijo', 'variable', 'venta_fisica', 'venta_plataforma')),
  concepto TEXT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  socio_id UUID NOT NULL,
  proveedor_id UUID,
  fecha DATE NOT NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  direccion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabla de INVENTARIO
CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  unidad TEXT NOT NULL,
  precio_promedio DECIMAL(10, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabla de REPORTES EXTERNOS (Uber Eats, Didi Food)
CREATE TABLE IF NOT EXISTS reportes_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL CHECK (plataforma IN ('uber_eats', 'didi_food')),
  fecha_inicio DATE,
  fecha_fin DATE,
  ingresos_brutos DECIMAL(10, 2),
  comisiones DECIMAL(10, 2),
  promociones DECIMAL(10, 2),
  dinero_neto DECIMAL(10, 2),
  archivo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tabla de DEUDAS (para tracking de deuda empresa)
CREATE TABLE IF NOT EXISTS deudas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id UUID NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  mes TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- ÍNDICES (para mejor performance)
-- ========================================

CREATE INDEX idx_gastos_socio_id ON gastos(socio_id);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_tipo ON gastos(tipo);
CREATE INDEX idx_reportes_plataforma ON reportes_externos(plataforma);
CREATE INDEX idx_deudas_socio_id ON deudas(socio_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;

-- Políticas para GASTOS (todos pueden ver, pero solo guardar propios)
CREATE POLICY "Todos pueden ver gastos"
  ON gastos FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden insertar sus propios gastos"
  ON gastos FOR INSERT
  WITH CHECK (auth.uid() = socio_id);

-- Políticas para REPORTES (todos pueden ver)
CREATE POLICY "Todos pueden ver reportes"
  ON reportes_externos FOR SELECT
  USING (true);

-- Políticas para DEUDAS (todos pueden ver)
CREATE POLICY "Todos pueden ver deudas"
  ON deudas FOR SELECT
  USING (true);

-- ========================================
-- FIN SETUP SQL
-- ========================================
--
-- Próximos pasos:
-- 1. Ve a Authentication > Users
-- 2. Crea estos 4 usuarios:
--    - juan@chilaquiles.com / 123456
--    - maria@chilaquiles.com / 123456
--    - carlos@chilaquiles.com / 123456
--    - pedro@chilaquiles.com / 123456
--
-- 3. Luego ejecuta: npm run dev
-- ========================================
