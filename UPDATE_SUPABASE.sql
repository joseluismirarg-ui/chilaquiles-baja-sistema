-- ========================================
-- ACTUALIZACIÓN: Agregar soporte para ganancias manuales
-- Ejecuta esto en Supabase SQL Editor si la tabla gastos ya existe
-- ========================================

-- Si la tabla ya tiene la constraint, primero hay que eliminarla
ALTER TABLE gastos DROP CONSTRAINT gastos_tipo_check;

-- Luego agregar la nueva constraint con el nuevo tipo
ALTER TABLE gastos ADD CONSTRAINT gastos_tipo_check
  CHECK (tipo IN ('fijo', 'variable', 'venta_fisica', 'venta_plataforma', 'ganancia_manual'));

-- ========================================
-- LISTO
-- ========================================

-- Ahora ya puedes registrar ganancias manuales desde la app
