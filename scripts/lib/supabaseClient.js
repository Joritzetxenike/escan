const { createClient } = require('@supabase/supabase-js');

function crearCliente() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!url) throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL');
  if (!serviceKey && !anonKey) throw new Error('Falta clave de Supabase');

  if (!serviceKey) {
    console.warn(
      'AVISO: usando anon key. Si las inserciones fallan por RLS, define SUPABASE_SERVICE_ROLE_KEY en .env'
    );
  }

  return createClient(url, serviceKey || anonKey);
}

module.exports = { crearCliente };
