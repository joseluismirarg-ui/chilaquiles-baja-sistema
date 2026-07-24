-- TABLA: CIERRE DE CAJA DIARIO
CREATE TABLE cierre_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  apertura DECIMAL(12, 2) DEFAULT 0,
  ventas_fisicas DECIMAL(12, 2) DEFAULT 0,
  ventas_plataforma DECIMAL(12, 2) DEFAULT 0,
  otros_ingresos DECIMAL(12, 2) DEFAULT 0,
  total_ingresos DECIMAL(12, 2) DEFAULT 0,
  gastos_variables DECIMAL(12, 2) DEFAULT 0,
  gastos_fijos DECIMAL(12, 2) DEFAULT 0,
  otros_egresos DECIMAL(12, 2) DEFAULT 0,
  total_egresos DECIMAL(12, 2) DEFAULT 0,
  saldo_teorico DECIMAL(12, 2),
  efectivo_contado DECIMAL(12, 2),
  diferencia DECIMAL(12, 2),
  notas TEXT,
  responsable_cierre TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT cierre_caja_fecha_check CHECK (fecha <= CURRENT_DATE)
);

-- Habilitar RLS
ALTER TABLE cierre_caja ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
DROP POLICY IF EXISTS "Anyone can view cierre_caja" ON cierre_caja;
CREATE POLICY "Anyone can view cierre_caja" ON cierre_caja
  FOR SELECT USING (true);

-- Política para INSERT
DROP POLICY IF EXISTS "Anyone can insert cierre_caja" ON cierre_caja;
CREATE POLICY "Anyone can insert cierre_caja" ON cierre_caja
  FOR INSERT WITH CHECK (true);

-- Política para UPDATE
DROP POLICY IF EXISTS "Anyone can update cierre_caja" ON cierre_caja;
CREATE POLICY "Anyone can update cierre_caja" ON cierre_caja
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- TABLA: PRESUPUESTOS
CREATE TABLE presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mes TEXT NOT NULL UNIQUE,
  presupuesto_ventas DECIMAL(12, 2),
  presupuesto_gastos_variables DECIMAL(12, 2),
  presupuesto_gastos_fijos DECIMAL(12, 2),
  meta_margen DECIMAL(5, 2),
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS en presupuestos
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Política para presupuestos
DROP POLICY IF EXISTS "Anyone can view presupuestos" ON presupuestos;
CREATE POLICY "Anyone can view presupuestos" ON presupuestos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert presupuestos" ON presupuestos;
CREATE POLICY "Anyone can insert presupuestos" ON presupuestos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update presupuestos" ON presupuestos;
CREATE POLICY "Anyone can update presupuestos" ON presupuestos
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- TABLA: CLIENTES
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  preferencias TEXT,
  total_gastado DECIMAL(12, 2) DEFAULT 0,
  numero_pedidos INT DEFAULT 0,
  ultima_compra DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view clientes" ON clientes;
CREATE POLICY "Anyone can view clientes" ON clientes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert clientes" ON clientes;
CREATE POLICY "Anyone can insert clientes" ON clientes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update clientes" ON clientes;
CREATE POLICY "Anyone can update clientes" ON clientes
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- TABLA: MOVIMIENTOS DE INVENTARIO (para tracking FIFO/LIFO)
CREATE TABLE movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES inventario(id),
  tipo TEXT CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'merma')),
  cantidad DECIMAL(12, 2),
  precio_unitario DECIMAL(12, 2),
  referencia TEXT,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Anyone can view movimientos_inventario" ON movimientos_inventario
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert movimientos_inventario" ON movimientos_inventario;
CREATE POLICY "Anyone can insert movimientos_inventario" ON movimientos_inventario
  FOR INSERT WITH CHECK (true);
