import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemDeErro } from './core/erros';
import { brl, hoje, previaDasParcelas } from './core/formatadores';
import type { Cliente } from './core/modelos';
import { NotificacaoServico } from './core/notificacao.servico';
import { ParcelasServico } from './core/parcelas.servico';
import { IconeComponent } from './icone.component';
import { ParcelasComponent } from './parcelas.component';

const formularioVazio = () => ({
  nome: '',
  endereco: '',
  telefone: '',
  descricao: '',
  total: 2000,
  parcelas: 4,
  primeiroVencimento: hoje(),
});

@Component({
  selector: 'app-pagamentos',
  imports: [FormsModule, IconeComponent, ParcelasComponent],
  template: `
    <section class="cartao">
      <h2>Novo pagamento parcelado</h2>
      <div class="grade-campos">
        <label class="campo">Cliente / estabelecimento
          <input list="cl" maxlength="120" autocomplete="off" [(ngModel)]="f.nome" (change)="preencherCliente()" />
        </label>
        <datalist id="cl">
          @for (c of clientes(); track c.id) { <option [value]="c.name"></option> }
        </datalist>
        <label class="campo">Endereço da cobrança <input maxlength="250" [(ngModel)]="f.endereco" /></label>
        <label class="campo">Telefone <input type="tel" inputmode="tel" maxlength="30" [(ngModel)]="f.telefone" /></label>
        <label class="campo">O que foi vendido <input maxlength="250" [(ngModel)]="f.descricao" /></label>
        <label class="campo">Valor total (R$) <input type="number" inputmode="decimal" min="0.01" step="0.01" [(ngModel)]="f.total" /></label>
        <label class="campo">Nº de parcelas <input type="number" inputmode="numeric" min="1" max="60" step="1" [(ngModel)]="f.parcelas" /></label>
        <label class="campo">Primeiro vencimento <input type="date" [(ngModel)]="f.primeiroVencimento" /></label>
      </div>
      @if (previa()) {
        <p class="previa">
          <app-icone nome="pagamentos" />
          <span>{{ previa() }}, sempre no dia {{ f.primeiroVencimento.slice(8) }} de cada mês (meses mais curtos usam o último dia).</span>
        </p>
      }
      <div class="rodape-form">
        <button class="btn ok grande" (click)="salvar()" [disabled]="!valido() || ocupado()">
          <app-icone nome="check" />{{ ocupado() ? 'Cadastrando…' : 'Cadastrar pagamento' }}
        </button>
      </div>
    </section>

    <h2 class="titulo-secao">Todas as parcelas</h2>
    <app-parcelas [mostrarPagas]="true" />
  `,
})
export class PagamentosComponent {
  private readonly servico = inject(ParcelasServico);
  private readonly avisos = inject(NotificacaoServico);

  readonly clientes = signal<Cliente[]>([]);
  readonly ocupado = signal(false);
  f = formularioVazio();

  constructor() {
    effect(() => {
      this.servico.versao();
      untracked(() => void this.carregarClientes());
    });
  }

  previa(): string {
    return previaDasParcelas(Number(this.f.total), Number(this.f.parcelas));
  }

  valido(): boolean {
    const { nome, total, parcelas, primeiroVencimento } = this.f;
    return (
      nome.trim().length > 0 &&
      Number(total) > 0 &&
      Number.isInteger(Number(parcelas)) &&
      Number(parcelas) >= 1 &&
      Number(parcelas) <= 60 &&
      /^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)
    );
  }

  preencherCliente(): void {
    const cliente = this.clientes().find((c) => c.name.toLowerCase() === this.f.nome.trim().toLowerCase());
    if (!cliente) return;
    this.f.endereco = cliente.address ?? '';
    this.f.telefone = cliente.phone ?? '';
  }

  async salvar(): Promise<void> {
    if (!this.valido()) return;
    const f = this.f;
    this.ocupado.set(true);
    try {
      await this.servico.criarPagamento({
        cliente: { nome: f.nome.trim(), endereco: f.endereco.trim(), telefone: f.telefone.trim() },
        descricao: f.descricao.trim(),
        total: Math.round(Number(f.total) * 100) / 100,
        parcelas: Number(f.parcelas),
        primeiro_vencimento: f.primeiroVencimento,
      });
      this.f = { ...f, nome: '', endereco: '', telefone: '', descricao: '' };
      this.avisos.sucesso(`Pagamento cadastrado: ${previaDasParcelas(Number(f.total), Number(f.parcelas)) || brl(Number(f.total))}.`);
    } catch (e) {
      this.avisos.erro(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  private async carregarClientes(): Promise<void> {
    try {
      this.clientes.set(await this.servico.listarClientes());
    } catch {
      // a lista só alimenta o autocompletar; falha aqui não bloqueia o cadastro
    }
  }
}
