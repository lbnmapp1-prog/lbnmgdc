# Migración de Airtable + Netlify a Supabase + Vercel

Qué cambió: los datos y el inicio de sesión viven en **Supabase** (Postgres con reglas de
seguridad por rol), la web se publica en **Vercel**, y la única función de servidor
(`api/admin-users.js`, crear/editar/borrar usuarios) corre en Vercel. Ya no hay ningún
secreto escrito en el código del navegador.

## 1. Supabase (una sola vez)

1. **SQL Editor** → pega y ejecuta `supabase/schema.sql` completo (tablas, reglas RLS,
   bucket privado `clases` para los PDF, y las funciones del formulario público).
2. **Authentication → Providers → Email**: desactiva **Enable email signups** (los
   usuarios los crea solo un administrador).
3. **Authentication → URL Configuration**: *Site URL* = la dirección de tu app en Vercel
   (por ejemplo `https://pastoreo-gdc.vercel.app`); agrégala también en *Redirect URLs*.
   Sin esto los correos de "elegir contraseña" no vuelven a la app.
4. **Authentication → SMTP**: configura un SMTP propio (Resend, Brevo, etc.). El correo
   por defecto de Supabase permite muy pocos envíos por hora y no alcanza para avisar a
   todos los usuarios.
5. **Settings → API**: copia `Project URL`, `anon public` y `service_role`.

## 2. Código y Vercel

1. Edita `js/config.js` con el `Project URL` y la `anon` key (son públicas por diseño).
2. En Vercel: *Add New → Project* → importa el repositorio (Framework: **Other**, sin build).
3. **Settings → Environment Variables** (solo en Vercel, nunca en el repositorio):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  ← secreta; da acceso total a la base
4. Despliega.

## 3. Día de la migración (corte de una vez)

1. Avisa a los líderes que **no usen el sistema** durante la migración.
2. En tu computador (variables solo en tu terminal; la service_role no se pega en chats ni en archivos):
   ```bash
   export AIRTABLE_TOKEN=...            # token de Airtable con solo lectura
   export SUPABASE_URL=https://TU_PROYECTO.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=...
   export APP_URL=https://tu-app.vercel.app

   node scripts/migrar-airtable-a-supabase.mjs                 # simulacro: valida y cuenta, no escribe
   node scripts/migrar-airtable-a-supabase.mjs --ejecutar      # migración real
   node scripts/migrar-airtable-a-supabase.mjs --ejecutar --enviar-correos   # + correos de contraseña nueva
   ```
   Revisa los avisos del simulacro (fechas inválidas, miembros huérfanos…) antes de ejecutar.
   Es repetible: correrlo otra vez no duplica datos.
3. Compara los conteos Airtable vs. Supabase que imprime el script.
4. Entra a la app con un usuario Pastor/Super Usuario y revisa miembros, seguimiento, rueda,
   organigrama, calendario y un PDF de Temas.
5. **Contraseñas:** las de Airtable no se copian. Cada usuario recibe un correo para elegir
   la suya, o usa "¿Olvidaste tu contraseña?" en el login.

## 4. Después de verificar

- **Revoca el token de Airtable** que estaba en el código (`js/airtable.js`, ya eliminado):
  sigue visible en el historial de git. Airtable → Developer hub → tokens → *Revoke*.
- Cuando estés conforme, pasa la base de Airtable a solo lectura o archívala.
- Deja de usar Netlify (se eliminó `netlify.toml` y su función).
- Opcional: quita las columnas `airtable_id` de las tablas.

## Cómo está protegido

- Cada tabla tiene **RLS**: un líder solo ve y escribe su grupo; los administradores todo;
  eventos y clases solo los escriben administradores.
- Un usuario no puede cambiarse el rol ni el grupo.
- Los PDF están en un bucket **privado** (se abren con enlaces firmados de 1 hora).
- El formulario público (`evaluar.html`) solo puede llamar a dos funciones que validan
  los datos y dejan todo como "Pendiente" hasta que el líder lo apruebe (máx. 3 pendientes por miembro).

## Mantenimiento

- `js/vendor/supabase.js` es `@supabase/supabase-js` 2.117.3 empaquetado (sin CDN externo).
  Para actualizarlo:
  ```bash
  npm i @supabase/supabase-js esbuild
  echo "export { createClient } from '@supabase/supabase-js';" > entry.js
  npx esbuild entry.js --bundle --format=esm --minify --platform=browser --target=es2020 --outfile=js/vendor/supabase.js
  ```
