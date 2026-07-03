// NO ACTIVO — referencia para la migración futura a Supabase (ver future-migration/schema.sql).
// La app hoy corre sobre Airtable (js/db.js, js/auth.js). Cuando el cliente
// apruebe la migración: reemplazar js/db.js y js/auth.js por versiones que
// importen de aquí, aplicar schema.sql, y usar admin-users.edge-function.ts
// para las operaciones de usuarios que requieren la service_role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Reemplaza estos dos valores con los de tu proyecto (Settings > API en supabase.com).
// Son seguros de exponer en el cliente: la seguridad real la impone Row Level
// Security en la base de datos, no el secreto de esta clave.
export const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
