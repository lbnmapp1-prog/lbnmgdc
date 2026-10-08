import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const CONFIGURADO = !SUPABASE_URL.includes('TU_PROYECTO') && !SUPABASE_ANON_KEY.includes('TU_ANON_KEY');

// Se captura antes de crear el cliente: este lo limpia de la URL al procesar el enlace.
export const ENLACE_RECUPERACION = /type=recovery/.test(globalThis.location?.hash || '');

export const supabase = createClient(
  CONFIGURADO ? SUPABASE_URL : 'https://sin-configurar.invalid',
  CONFIGURADO ? SUPABASE_ANON_KEY : 'sin-configurar',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } },
);
