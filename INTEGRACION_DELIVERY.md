# 🔌 Integración por API con Uber Eats y Didi Food

Conecta las plataformas de delivery para que las ventas entren solas al sistema,
sin descargar ni subir archivos.

---

## ⚠️ Lo primero que tienes que saber

**El código ya está listo, pero no puede funcionar hasta que las plataformas te
den credenciales de API.** Ninguna de las dos las entrega automáticamente:

| Plataforma | Cómo se obtiene | Tiempo típico |
|---|---|---|
| **Uber Eats** | Alta en [developer.uber.com](https://developer.uber.com), crear la app y solicitar acceso a las *Marketplace APIs* para tu tienda. Uber tiene que aprobar los scopes. | Días o semanas |
| **Didi Food** | Portal de desarrolladores en [developer.didi-food.com](https://developer.didi-food.com). El acceso a la Open API se habilita por cuenta de comercio, así que normalmente hay que pedirlo también a soporte o a tu ejecutivo. | Variable |

Mientras llegan, la **carga manual de archivos en `/reportes` sigue funcionando
igual que antes**. Nada de lo que ya usas se rompió.

---

## 🔑 Paso 0 — Conseguir las credenciales

Este trámite lo tiene que hacer el dueño del negocio: implica firmar acuerdos y
verificar datos fiscales. No se puede automatizar.

### Uber Eats

Según la guía *Getting Started* de Uber, el alta tiene cuatro requisitos:

1. **Cuenta de desarrollador** en [developer.uber.com](https://developer.uber.com).
   Se empieza con una app de **Sandbox**.
2. **Crear la app** en el portal. Ahí salen el `client_id` y el `client_secret`,
   y se registran la Redirect URI y la URL de política de privacidad.
3. **Acuerdos legales**: NDA y contrato de licencia de la API.
4. **Aprobación del partner manager** de Uber Eats. Los scopes de producción
   sólo funcionan después de que el equipo de Uber Eats apruebe y ponga tu app
   en la lista blanca.

El paso 4 es el que tarda. Si no tienes partner manager asignado, pídelo desde
el portal de comercios de Uber Eats.

Ten a la mano: razón social y RFC, el nombre del restaurante como aparece en
Uber Eats, y el UUID de la sucursal.

### Didi Food

1. Entra a [developer.didi-food.com](https://developer.didi-food.com) y crea la
   cuenta de desarrollador.
2. Pide que habiliten la **Open API** para tu comercio. El acceso se otorga por
   cuenta, así que normalmente hay que solicitarlo por soporte además de
   registrarse en el portal:
   - Correo de tiendas: `soporte.tienda@mx.didiglobal.com`
   - Línea de restaurantes México: 800 323 3434
   - Restaurantes premium: 800 801 0186
3. Cuando lo habiliten, pide explícitamente estos cuatro datos, porque son los
   que el sistema necesita y no siempre los mandan completos:
   - `app_id` y `app_secret`
   - **URL base de la API** para México
   - **Algoritmo de firma** (HMAC-SHA256 o MD5) y el orden exacto de los
     parámetros al firmar
   - **Si los importes vienen en centavos o en pesos**

> Existe también la ruta indirecta vía un integrador POS (Deliverect, Ordatic).
> Sirve si el alta directa se atora, pero implica costo mensual y que los datos
> pasen por un tercero.

---

## 📋 Paso 1 — Base de datos

En Supabase → **SQL Editor**, ejecuta:

```
UPDATE_SUPABASE_DELIVERY.sql
```

Crea las tablas `pedidos_delivery`, `sincronizaciones_delivery` y
`eventos_delivery`, y agrega las columnas de idempotencia a `gastos` y
`reportes_externos`. Se puede correr varias veces sin problema.

---

## 📋 Paso 2 — Variables de entorno

Copia `.env.example` a `.env.local` y llena los valores. Las imprescindibles:

```bash
SUPABASE_SERVICE_ROLE_KEY=   # Supabase > Settings > API > service_role
DELIVERY_SYNC_SOCIO_ID=      # UUID del socio al que se atribuyen los ingresos

UBER_EATS_CLIENT_ID=
UBER_EATS_CLIENT_SECRET=
UBER_EATS_STORE_IDS=         # UUIDs de sucursal separados por coma

DIDI_FOOD_APP_ID=
DIDI_FOOD_APP_SECRET=
DIDI_FOOD_API_URL=           # la base que te dé Didi
DIDI_FOOD_STORE_IDS=
```

> 🔐 `SUPABASE_SERVICE_ROLE_KEY` salta las políticas de seguridad de la base.
> Sólo va en el servidor. Nunca la pongas en una variable `NEXT_PUBLIC_`.

Cada plataforma es independiente: si sólo tienes las de Uber Eats, esa se
sincroniza y Didi Food aparece como "sin credenciales".

En Vercel, agrega las mismas variables en **Settings → Environment Variables** y
vuelve a desplegar.

---

## 📋 Paso 3 — Probar

1. Entra a **`/integraciones`** (menú superior).
2. Presiona **Probar conexión**: hace una llamada real de autenticación contra
   cada plataforma y te dice si las credenciales sirven.
3. Elige un rango de fechas corto (2 o 3 días) y presiona **Sincronizar**.
4. Verifica los totales contra el panel de Uber Eats / Didi Food.

Sincronizar el mismo rango dos veces **actualiza** los datos, no los duplica. Si
la plataforma ajusta cifras después (una cancelación tardía, un reembolso),
vuelve a sincronizar ese rango y el sistema se corrige solo.

---

## 🔁 Sincronización automática

Hay dos formas de disparar la sincronización sin entrar a la app:

**Cron de Vercel** — crea `vercel.json`:

```json
{
  "crons": [{ "path": "/api/delivery/cron", "schedule": "0 9 * * *" }]
}
```

**Cualquier cron externo** — llama a la ruta con el secreto compartido:

```bash
curl -X POST https://TU-DOMINIO/api/delivery/sincronizar \
  -H "x-cron-secret: $DELIVERY_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"fechaInicio":"2026-07-18","fechaFin":"2026-07-24"}'
```

Si omites las fechas, sincroniza los últimos 7 días.

> ⏱️ El reporte de Uber es asíncrono y puede tardar varios minutos. La ruta
> declara `maxDuration = 300` (5 min). En el plan gratuito de Vercel el límite
> real es menor: si te topas con timeouts, sincroniza rangos más cortos o sube
> de plan.

---

## 📡 Webhooks (opcional)

Para enterarse de los pedidos casi en tiempo real, registra estas URLs:

| Plataforma | URL a registrar |
|---|---|
| Uber Eats | `https://TU-DOMINIO/api/delivery/uber-eats/webhook` |
| Didi Food | `https://TU-DOMINIO/api/delivery/didi-food/webhook` |

Ambas rutas **verifican la firma HMAC-SHA256** del cuerpo y rechazan con 401 lo
que no venga firmado con tu secreto.

**Los webhooks no son la fuente de verdad contable.** Las plataformas ajustan
cifras después del hecho, así que el dinero definitivo lo fija siempre la
sincronización por rango. Los eventos se guardan en `eventos_delivery` para
auditoría, y en el caso de Didi (que sí manda importes en la notificación) se
recalcula el total del día.

---

## 💰 Cómo se registran las ventas

Por cada día y plataforma se crea **un** movimiento en `gastos`:

```
tipo:       venta_plataforma
concepto:   "Venta Uber Eats 2026-07-24"
monto:      dinero NETO del día
origen_ref: "uber_eats:2026-07-24"   ← llave que evita duplicados
```

Se registra el **neto** (lo que la plataforma efectivamente deposita), no el
bruto. El desglose de comisiones y promociones queda en `reportes_externos` y
`pedidos_delivery` para analizar márgenes, pero el dashboard refleja el dinero
real que entra a la cuenta.

Los pedidos cancelados se guardan pero no suman al ingreso.

---

## 🧭 Arquitectura

```
lib/delivery/
├── types.ts               Formas normalizadas + agregación por periodo
├── config.ts              Lectura de credenciales (sólo servidor)
├── http.ts                fetch con timeout, reintentos y respeto a Retry-After
├── supabase-servidor.ts   Cliente service-role + validación del token del socio
├── uber-eats.ts           OAuth2 + API de reportes + parseo del CSV
├── didi-food.ts           Firma de peticiones + consulta paginada de pedidos
├── webhooks.ts            Verificación de firma y registro de eventos
└── sync.ts                Orquestación y escritura idempotente en Supabase

app/api/delivery/
├── estado/                GET  — estado de cada plataforma
├── sincronizar/           POST — trae y guarda un rango de fechas
├── uber-eats/webhook/     POST — receptor firmado
└── didi-food/webhook/     POST — receptor firmado

app/integraciones/         Pantalla de estado y sincronización manual
```

Agregar una tercera plataforma (Rappi, por ejemplo) es implementar el tipo
`ConectorDelivery` y añadirla a `conectoresDisponibles()`.

Para verificar el parseo, la agregación por periodo y las firmas sin tocar la
red:

```bash
npm run probar:delivery
```

---

## 🔧 Ajustar rutas y formatos

Uber versiona sus endpoints por partner y Didi los asigna por región. **Confirma
los tuyos contra la documentación que te entreguen** y, si no coinciden con los
valores por defecto, ajústalos por variable de entorno sin tocar código:

```bash
UBER_EATS_TOKEN_URL=
UBER_EATS_API_URL=
UBER_EATS_REPORT_PATH=
UBER_EATS_REPORT_TYPE=
UBER_EATS_SCOPE=

DIDI_FOOD_TOKEN_URL=
DIDI_FOOD_ORDERS_PATH=
DIDI_FOOD_SIGN_ALGO=          # hmac-sha256 | md5
DIDI_FOOD_AMOUNTS_IN_CENTS=   # true | false
```

El esquema de firma de Didi vive en una sola función, `firmarParametros()` en
`lib/delivery/didi-food.ts`: si tu contrato usa otro orden o separador, ese es
el único lugar a cambiar.

---

## ❓ Problemas comunes

**"No autorizado" (401) en `/integraciones`**
Tu sesión expiró. Sal y vuelve a entrar.

**"Falta SUPABASE_SERVICE_ROLE_KEY"**
No está en `.env.local` (o en Vercel). Sin ella no se puede escribir en la base.

**"Uber Eats no devolvió access_token"**
Revisa `UBER_EATS_CLIENT_ID` / `UBER_EATS_CLIENT_SECRET` y confirma que Uber ya
aprobó los scopes de tu app.

**"Didi Food no devolvió access_token"**
Casi siempre es el algoritmo de firma. Prueba `DIDI_FOOD_SIGN_ALGO=md5`.

**"No se reconoció la columna de ventas en el reporte de Uber Eats"**
El CSV llegó con encabezados que el parser no conoce. El aviso incluye las
columnas recibidas: agrégalas a las listas `ALIAS_*` de
`lib/delivery/uber-eats.ts` y suma el caso a `scripts/probar-delivery.ts`.

**Los montos salen 100 veces más grandes o más chicos (Didi)**
Es la conversión de centavos. Cambia `DIDI_FOOD_AMOUNTS_IN_CENTS`.
