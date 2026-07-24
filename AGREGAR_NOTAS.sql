-- ========================================
-- AGREGAR TABLA DE NOTAS COMPARTIDAS
-- Ejecuta esto en Supabase SQL Editor
-- ========================================

-- Crear tabla de notas
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL,
  autor_email TEXT NOT NULL,
  contenido TEXT NOT NULL,
  tipo TEXT DEFAULT 'general' CHECK (tipo IN ('general', 'insumos_faltantes', 'urgente')),
  fecha_nota DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices
CREATE INDEX idx_notas_fecha ON notas(fecha_nota DESC);
CREATE INDEX idx_notas_tipo ON notas(tipo);
CREATE INDEX idx_notas_created ON notas(created_at DESC);

-- Habilitar RLS
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

-- Políticas - Todos pueden ver
CREATE POLICY "Todos pueden ver notas"
  ON notas FOR SELECT
  USING (true);

-- Política - Solo pueden insertar sus propias notas
CREATE POLICY "Usuarios pueden insertar notas"
  ON notas FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

-- ========================================
-- LISTO - Tabla de notas creada
-- ========================================
