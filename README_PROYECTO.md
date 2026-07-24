# 🌶️ Chilaquiles Baja - Sistema Contable

Sistema de gestión contable y financiero para Chilaquiles Baja con autenticación, gastos, reportes de plataformas y cálculo automático de utilidades.

## 🚀 Inicio rápido

### 1. Configurar Supabase

Primero crea un proyecto en https://supabase.com

1. Copia la URL y anon key de tu proyecto
2. Actualiza `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
   ```
3. Sigue **SETUP_SUPABASE.md** para crear tablas y usuarios

### 2. Ejecutar

```bash
npm install
npm run dev
```

Abre http://localhost:3000

### 3. Logins de prueba

```
juan@chilaquiles.com / 123456
maria@chilaquiles.com / 123456
carlos@chilaquiles.com / 123456
pedro@chilaquiles.com / 123456
```

## ✨ Funcionalidades

✅ **Dashboard** - Métricas en tiempo real (ventas, gastos, utilidad, margen)  
✅ **Registro de gastos** - Fijo, variable, venta física, venta plataforma  
✅ **Carga de reportes** - Uber Eats, Didi Food (CSV/Excel)  
✅ **Cálculo de utilidades** - Reparto justo y automático entre socios  
✅ **Historial** - Todas las transacciones registradas  

## 📂 Estructura

```
├── app/
│   ├── dashboard/         # Dashboard principal
│   ├── login/            # Autenticación
│   ├── gastos/registrar  # Registro de gastos
│   └── reportes/         # Reportes y carga de archivos
├── components/
│   └── Navbar.tsx        # Navegación
├── lib/
│   ├── gastos.ts         # Funciones de gastos
│   ├── utilidades.ts     # Cálculo de utilidades
│   ├── parsers.ts        # Parse de CSV/Excel
│   ├── supabase.ts       # Cliente Supabase
│   └── types.ts          # Tipos TypeScript
└── SETUP_SUPABASE.md     # Instrucciones Supabase
```

## 💡 Cómo funciona el cálculo de utilidades

**Fórmula:**

1. **Ingresos totales** - Ventas física + plataformas
2. **Menos gastos** - Fijos + variables
3. **= Utilidad neta**

**Repartición:**
- Se repone a cada socio lo que gastó
- Con el remanente:
  - 20% para cada socio (igual para los 4)
  - 20% para fondo de empresa
- Si hay déficit, se reparte proporcionalmente

**Deuda:**
- Si un socio gastó más que su parte de utilidad, la empresa le debe
- Se va pagando con futuras utilidades

## 📊 Próximas funcionalidades

- [ ] Inventario de insumos
- [ ] Calculadora de producción (cuántos chilaquiles salen)
- [ ] Gestión de proveedores avanzada
- [ ] Lista de compras inteligente
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Gráficos de tendencias
- [ ] Alertas de bajo inventario

## 🔧 Tech Stack

- **Frontend:** Next.js 14, React 19, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Parsing:** csv-parse, xlsx
- **Deploy:** Vercel

## 🚀 Deploy a Vercel

1. Sube a GitHub
2. Conecta repo en Vercel
3. Agrega variables de entorno:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Deploy automático ✨

## 📝 Desarrollo

### Agregar nueva funcionalidad

1. Crea componente en `components/`
2. Agrega función en `lib/`
3. Crea ruta en `app/nueva-ruta/`
4. Usa tipos de `lib/types.ts`

### Debugging

- Revisa console del navegador (F12)
- Checa Supabase studio para ver datos
- Los logs están en `npm run dev`

## 🤝 Estructura de datos

Cada transacción tiene:
- `tipo` - fijo, variable, venta_fisica, venta_plataforma
- `concepto` - descripción
- `monto` - cantidad
- `socio_id` - quién la registró
- `fecha` - cuándo
- `proveedor_id` - opcional, de dónde se compró

Los reportes de plataformas guardan:
- `plataforma` - uber_eats, didi_food
- `ingresos_brutos` - antes de comisiones
- `comisiones` - lo que se llevan
- `promociones` - descuentos
- `dinero_neto` - lo que finalmente entra

---

¿Preguntas? Contacta al equipo de desarrollo.
