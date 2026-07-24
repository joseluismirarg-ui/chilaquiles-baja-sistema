# 🚀 Primeros Pasos - Chilaquiles Baja

## ✅ Estado actual

Tu `.env.local` ya tiene:
- ✅ URL de Supabase
- ✅ Anon key

Ahora solo falta:

## 1️⃣ Crear las tablas (5 minutos)

1. Abre tu dashboard de Supabase: https://app.supabase.com
2. Ve a tu proyecto
3. En el menú lateral, busca **SQL Editor**
4. Haz clic en **New query**
5. Copia TODO el contenido de `SETUP_SUPABASE_SQL.sql` de este proyecto
6. Pégalo en el editor SQL de Supabase
7. Haz clic en **Run** (botón azul)

✅ Listo, las tablas están creadas

## 2️⃣ Crear los 4 usuarios (5 minutos)

1. En Supabase, ve a **Authentication** (en el menú lateral)
2. Ve a la pestaña **Users**
3. Haz clic en **Invite** (botón azul)
4. Crea estos 4 usuarios:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| juan@chilaquiles.com | 123456 | Socio |
| maria@chilaquiles.com | 123456 | Socio |
| carlos@chilaquiles.com | 123456 | Socio |
| pedro@chilaquiles.com | 123456 | Socio |

**Nota:** Supabase te pedirá que confirmes, pero como son usuarios de prueba, puedes usar cualquier contraseña.

✅ Listo, usuarios creados

## 3️⃣ Ejecutar la app localmente (2 minutos)

En tu terminal:

```bash
cd "C:\Users\josel\CHILAQUILES BAJA\chilaquiles-app"
npm run dev
```

Debería decir:
```
> ready - started server on 0.0.0.0:3000
```

## 4️⃣ Probar en el navegador

Abre: http://localhost:3000

Deberías ver la página de login.

Prueba con:
- Email: `juan@chilaquiles.com`
- Contraseña: `123456`

Si entra, ¡todo está funcionando! 🎉

## 🎯 Qué hacer después

1. Registra algunos gastos desde el dashboard
2. Sube un reporte CSV de prueba
3. Ve los reportes de utilidades
4. Invita a los otros 3 socios a probar

## 🆘 Si algo no funciona

**"No se puede conectar a Supabase"**
- Revisa que `.env.local` tenga los valores correctos
- Reinicia `npm run dev`

**"Login no funciona"**
- Verifica que los usuarios existan en Supabase > Authentication > Users
- Revisa que uses la contraseña exacta (123456)

**"Botones no hacen nada"**
- Abre la consola del navegador (F12)
- Busca errores en rojo
- Comparte el error aquí

## 📊 Próximos pasos después de probar

Una vez que todo funcione:

1. **Personaliza** - Cambia nombres, colores, etc.
2. **Agrega inventario** - Crea la interfaz para inventario
3. **Deploy** - Sube a Vercel (es gratis)
4. **Invita socios** - Comparte el link con los otros 3

---

¿Necesitas ayuda? Avísame en qué paso te quedas stuck 👀
