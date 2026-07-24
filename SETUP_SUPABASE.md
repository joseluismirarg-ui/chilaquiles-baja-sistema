# Configuración de Supabase

## 1. Crear proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta y un nuevo proyecto
3. Copia la URL y la anon key

## 2. Actualizar `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## 3. Crear tablas en Supabase

Ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- Tabla de gastos
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  socio_id UUID NOT NULL,
  proveedor_id UUID,
  fecha DATE NOT NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de proveedores
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  direccion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de inventario
CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  unidad TEXT NOT NULL,
  precio_promedio DECIMAL(10, 2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de reportes externos
CREATE TABLE reportes_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  ingresos_brutos DECIMAL(10, 2),
  comisiones DECIMAL(10, 2),
  promociones DECIMAL(10, 2),
  dinero_neto DECIMAL(10, 2),
  archivo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de deudas
CREATE TABLE deudas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  socio_id UUID NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  mes TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. Habilitar autenticación

1. En Supabase, ve a Authentication → Providers
2. Habilita "Email" (ya viene habilitado)
3. Ve a Users y crea 4 usuarios:
   - juan@chilaquiles.com / 123456
   - maria@chilaquiles.com / 123456
   - carlos@chilaquiles.com / 123456
   - pedro@chilaquiles.com / 123456

## 5. Permisos RLS (Row Level Security)

Habilita RLS en todas las tablas para que cada usuario solo vea sus datos:

```sql
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all gastos"
  ON gastos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own gastos"
  ON gastos FOR INSERT
  WITH CHECK (auth.uid() = socio_id);
```

## 6. Listo!

Ejecuta `npm run dev` y ve a http://localhost:3000
