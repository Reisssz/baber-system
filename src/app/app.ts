import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutenticacaoServico } from './core/autenticacao.servico';
import { NotificacaoServico } from './core/notificacao.servico';
import { supabaseConfigurado } from './core/supabase';
import { TemaServico } from './core/tema.servico';
import { EstoqueComponent } from './estoque.component';
import { IconeComponent, type NomeIcone } from './icone.component';
import { PagamentosComponent } from './pagamentos.component';
import { ParcelasComponent } from './parcelas.component';

type Aba = 'cobrancas' | 'pagamentos' | 'estoque';

@Component({
  selector: 'app-root',
  imports: [FormsModule, IconeComponent, ParcelasComponent, PagamentosComponent, EstoqueComponent],
  template: `
    @if (!autenticacao.pronto()) {
      <div class="tela-carregando" role="status" aria-label="Carregando"><span class="spinner"></span></div>
    } @else if (!autenticacao.logado()) {
      <div class="login-pagina">
        <button class="btn borda icone alternar-tema" type="button" (click)="tema.alternar()" [attr.aria-label]="tema.tema() === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'">
          <app-icone [nome]="tema.tema() === 'escuro' ? 'sol' : 'lua'" />
        </button>
        <form class="login-card" (ngSubmit)="entrar()">
          <span class="marca-logo"></span>
          <h1>Barbearia</h1>
          <p class="sub">Gestão financeira e estoque</p>
          @if (!configurado) {
            <div class="alerta erro" role="alert">Configure a URL e a chave anon do Supabase em src/environments/environment.ts.</div>
          }
          <label class="campo">E-mail
            <input type="email" name="email" autocomplete="username" inputmode="email" required [(ngModel)]="email" />
          </label>
          <label class="campo">Senha
            <input type="password" name="senha" autocomplete="current-password" required [(ngModel)]="senha" />
          </label>
          @if (erro()) { <div class="alerta erro" role="alert">{{ erro() }}</div> }
          <button class="btn grande" [disabled]="entrando() || !email || !senha">{{ entrando() ? 'Entrando…' : 'Entrar' }}</button>
        </form>
      </div>
    } @else {
      <div class="app">
        <aside class="lateral">
          <div class="marca">
            <span class="marca-logo"></span>
            <div><strong>Barbearia</strong><small>Gestão</small></div>
          </div>
          <nav aria-label="Principal">
            @for (item of itens; track item.aba) {
              <button (click)="aba.set(item.aba)" [attr.aria-current]="aba() === item.aba ? 'page' : null">
                <app-icone [nome]="item.icone" />{{ item.titulo }}
              </button>
            }
          </nav>
        </aside>

        <div class="coluna">
          <header class="topbar">
            <span class="marca-logo"></span>
            <h1>{{ tituloAtual() }}</h1>
            <button class="btn borda icone alternar-tema" type="button" (click)="tema.alternar()" [attr.aria-label]="tema.tema() === 'escuro' ? 'Ativar modo claro' : 'Ativar modo escuro'">
              <app-icone [nome]="tema.tema() === 'escuro' ? 'sol' : 'lua'" />
            </button>
            <button class="btn borda" (click)="autenticacao.sair()" aria-label="Sair"><app-icone nome="sair" /><span>Sair</span></button>
          </header>
          <main class="conteudo">
            @switch (aba()) {
              @case ('cobrancas') { <app-parcelas [mostrarResumo]="true" /> }
              @case ('pagamentos') { <app-pagamentos /> }
              @case ('estoque') { <app-estoque /> }
            }
          </main>
        </div>

        <nav class="tabbar" aria-label="Principal">
          @for (item of itens; track item.aba) {
            <button (click)="aba.set(item.aba)" [attr.aria-current]="aba() === item.aba ? 'page' : null">
              <app-icone [nome]="item.icone" />{{ item.titulo }}
            </button>
          }
        </nav>
      </div>
    }

    @if (avisos.aviso(); as aviso) {
      <div class="toast" [class.erro]="aviso.tipo === 'erro'" role="status" aria-live="polite" (click)="avisos.fechar()">
        {{ aviso.texto }}
      </div>
    }
  `,
})
export class App {
  readonly autenticacao = inject(AutenticacaoServico);
  readonly avisos = inject(NotificacaoServico);
  readonly tema = inject(TemaServico);
  readonly configurado = supabaseConfigurado;

  readonly aba = signal<Aba>('cobrancas');
  readonly erro = signal('');
  readonly entrando = signal(false);
  readonly itens: { aba: Aba; titulo: string; icone: NomeIcone }[] = [
    { aba: 'cobrancas', titulo: 'Cobranças', icone: 'cobrancas' },
    { aba: 'pagamentos', titulo: 'Pagamentos', icone: 'pagamentos' },
    { aba: 'estoque', titulo: 'Estoque', icone: 'estoque' },
  ];

  email = '';
  senha = '';

  tituloAtual(): string {
    return this.itens.find((item) => item.aba === this.aba())?.titulo ?? '';
  }

  async entrar(): Promise<void> {
    this.entrando.set(true);
    this.erro.set('');
    try {
      await this.autenticacao.entrar(this.email.trim(), this.senha);
      this.senha = '';
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      this.entrando.set(false);
    }
  }
}
