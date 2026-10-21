import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from './supabase';

@Injectable({ providedIn: 'root' })
export class AutenticacaoServico {
  private readonly sessao = signal<Session | null>(null);

  /** Falso até a sessão salva ser lida, evitando piscar a tela de login. */
  readonly pronto = signal(false);
  readonly logado = computed(() => this.sessao() !== null);

  constructor() {
    supabase.auth.onAuthStateChange((_evento, sessao) => this.sessao.set(sessao));
    supabase.auth
      .getSession()
      .then(({ data }) => this.sessao.set(data.session))
      .catch(() => this.sessao.set(null))
      .finally(() => this.pronto.set(true));
  }

  async entrar(email: string, senha: string): Promise<void> {
    if (!supabaseConfigurado) {
      throw new Error('Configure a URL e a chave anon do Supabase em src/environments/environment.ts.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (!error) return;
    throw new Error(error.status === 400 ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.');
  }

  async sair(): Promise<void> {
    await supabase.auth.signOut();
  }
}
