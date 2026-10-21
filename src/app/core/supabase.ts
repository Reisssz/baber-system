import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { ErroDeBanco } from './erros';

const TEMPO_LIMITE_MS = 15_000;

export const supabaseConfigurado =
  !environment.supabaseUrl.includes('SEU-PROJETO') && !environment.supabaseAnonKey.startsWith('SUA_');

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
  global: {
    fetch: (entrada, init) => {
      const limite = AbortSignal.timeout(TEMPO_LIMITE_MS);
      const sinal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite;
      return fetch(entrada, { ...init, signal: sinal });
    },
  },
});

interface RespostaSupabase<T> {
  data: T;
  error: { message: string; code?: string } | null;
}

export async function resolver<T>(resposta: PromiseLike<RespostaSupabase<T>>): Promise<T> {
  const { data, error } = await resposta;
  if (error) throw new ErroDeBanco(error.message, error.code);
  return data;
}
