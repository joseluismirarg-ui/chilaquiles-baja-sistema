-- ========================================
-- ACTUALIZACIÓN: Agregar columna email_socio a gastos
-- Ejecuta esto en Supabase SQL Editor
-- ========================================

-- Agregar columna email_socio a la tabla gastos
ALTER TABLE gastos ADD COLUMN email_socio TEXT;

-- Opcional: Si quieres llenar los emails existentes (requiere acceso a auth.users)
-- UPDATE gastos g
-- SET email_socio = u.email
-- FROM auth.users u
-- WHERE g.socio_id = u.id AND g.email_socio IS NULL;

-- ========================================
-- LISTO
-- ========================================

-- Ahora los nuevos gastos guardarán el email del socio automáticamente
