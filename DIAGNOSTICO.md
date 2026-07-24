# 🔍 Diagnóstico de errores

Si ves errores al registrar gastos, sigue esta lista:

## ✅ Checklist

### 1. ¿Ejecutaste el SQL en Supabase?

[ ] Abrí https://app.supabase.com
[ ] Copié el contenido de `SETUP_SUPABASE_SQL.sql`
[ ] Lo pegué en SQL Editor de Supabase
[ ] Clickeé "Run"

**Si no lo hiciste, ese es el problema. Hazlo ahora.**

---

### 2. ¿Creaste los 4 usuarios?

[ ] Fui a Authentication > Users
[ ] Creé juan@chilaquiles.com
[ ] Creé maria@chilaquiles.com
[ ] Creé carlos@chilaquiles.com
[ ] Creé pedro@chilaquiles.com

---

### 3. ¿El `.env.local` está configurado?

Abre el archivo `.env.local` en el proyecto y verifica:

```
NEXT_PUBLIC_SUPABASE_URL=https://svnmsfqsgvmdkdoptlsq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Si está vacío o tiene "your_supabase_url_here", eso es el problema.

---

## 🔧 Errores comunes

### ❌ "Error 404 en /gastos"
**Solución:** Reinicia `npm run dev`

### ❌ "Las tablas no existen"
```
❌ Las tablas no existen en Supabase. Ejecuta SETUP_SUPABASE_SQL.sql primero
```
**Solución:** Ejecuta el SQL en Supabase (ver paso 1 arriba)

### ❌ "Permiso denegado"
```
❌ Permiso denegado. Revisa las políticas RLS en Supabase
```
**Solución:** 
1. Ve a Supabase
2. Ve a SQL Editor
3. Ejecuta este SQL:

```sql
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver gastos"
  ON gastos FOR SELECT
  USING (true);

CREATE POLICY "Insertar gastos propios"
  ON gastos FOR INSERT
  WITH CHECK (auth.uid() = socio_id);
```

### ❌ "No puedo loguearme"
**Solución:**
1. Verifica que el usuario existe en Supabase > Authentication > Users
2. Usa exactamente: `juan@chilaquiles.com` / `123456`
3. Reinicia el navegador (Ctrl+Shift+Del para limpiar cache)

### ❌ "Registré un gasto pero no aparece"
**Posibles causas:**
1. No has reloaded la página
2. El gasto se guardó pero estás en el mes equivocado
3. Falta crear las políticas RLS

**Solución:** Recarga (F5) y vuelve a intentar

---

## 🧪 Test rápido

1. Loguéate como juan@chilaquiles.com
2. Ve a Dashboard → Transacciones → Nuevo gasto
3. Llena:
   - Tipo: "Variable (insumos)"
   - Qué es: "Tomates"
   - Monto: "100"
4. Clickea "Guardar gasto"

Si funciona, todo está bien. Si da error, nota qué dice y vuelve aquí.

---

## 📞 Si nada funciona

Corre esto en la consola del navegador (F12) y comparte el output:

```javascript
console.log('Test Supabase:');
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...');
```

---

## 🆘 Errores específicos que puedas tener

**Si ves algo como esto:**
```
relation "gastos" does not exist
```
→ Ejecuta el SQL de setup

**Si ves esto:**
```
permission denied for schema public
```
→ Ejecuta las políticas RLS

**Si ves esto:**
```
undefined
```
→ El .env.local no está bien configurado

---

Avísame qué error específico ves y te ayudo 👇
