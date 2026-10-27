import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientePerfilComponent } from './cliente-perfil.component';
import { mensagemDeErro } from './core/erros';
import { brl, diaMes, inicial } from './core/formatadores';
import { ParcelasServico } from './core/parcelas.servico';
import { IconeComponent } from './icone.component';

type Ordem = 'nome' | 'maior' | 'menor' | 'atraso';

interface Devedor {
  id: string;
  nome: string;
  telefone: string;
  devido: number;
  atrasado: number;
  qtd: number;
  vencimento: string;
}

const ORDENS: { k: Ordem; t: string }[] = [
  { k: 'nome', t: 'A–Z' },
  { k: 'maior', t: 'Deve mais' },
  { k: 'menor', t: 'Deve menos' },
  { k: 'atraso', t: 'Mais atrasado' },
];

const porNome = (a: Devedor, b: Devedor): number => a.nome.localeCompare(b.nome, 'pt-BR');

@Component({
  selector: 'app-devedores',
  imports: [FormsModule, IconeComponent, ClientePerfilComponent],
  template: `
    @if (carregando()) {
      <div class="esqueleto" role="status" aria-label="Carregando devedores"><i></i><i></i><i></i></div>
    } @else if (erro()) {
      <div class="cartao" role="alert">
        <p class="erro-texto">{{ erro() }}</p>
        <button class="btn" style="margin-top: 12px" (click)="carregar()">Tentar novamente</button>
      </div>
    } @else if (!devedores().length) {
      <div class="vazio">
        <app-icone nome="check" />
        <p>Nenhum cliente com valores em aberto.</p>
      </div>
    } @else {
      <section class="resumo" aria-label="Resumo">
        <div class="stat" data-tom="atrasado"><span>Total a receber</span><strong>{{ brl(totalGeral()) }}</strong><small>{{ devedores().length }} devedor(es)</small></div>
      </section>

      <div class="devedores-barra">
        <label class="campo busca">
          <span class="sr-only">Buscar devedor</span>
          <input type="search" placeholder="Buscar por nome" maxlength="120" autocomplete="off" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
        </label>
        <div class="chips" role="group" aria-label="Ordenar por">
          @for (o of ordens; track o.k) {
            <button type="button" class="chip" [class.ativo]="ordem() === o.k" [attr.aria-pressed]="ordem() === o.k" (click)="ordem.set(o.k)">{{ o.t }}</button>
          }
        </div>
      </div>

      <ul class="devedores-lista">
        @for (d of visiveis(); track d.id) {
          <li>
            <button type="button" class="devedor" [attr.data-estado]="d.atrasado > 0 ? 'atrasado' : 'proxima'" (click)="perfil.set(d.id)">
              <span class="avatar" aria-hidden="true">{{ inicial(d.nome) }}</span>
              <span class="devedor-info">
                <strong>{{ d.nome }}</strong>
                <small>
                  {{ d.qtd }} parcela(s) ·
                  @if (d.atrasado > 0) { {{ brl(d.atrasado) }} em atraso } @else { próx. vencimento {{ diaMes(d.vencimento) }} }
                </small>
              </span>
              <span class="devedor-valor">{{ brl(d.devido) }}</span>
            </button>
          </li>
        } @empty {
          <li class="dica">Nenhum devedor encontrado para "{{ busca() }}".</li>
        }
      </ul>
    }

    @if (perfil(); as clienteId) {
      <app-cliente-perfil [clienteId]="clienteId" (fechar)="perfil.set(null)" />
    }
  `,
})
export class DevedoresComponent {
  private readonly servico = inject(ParcelasServico);

  readonly devedores = signal<Devedor[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');
  readonly perfil = signal<string | null>(null);
  readonly busca = signal('');
  readonly ordem = signal<Ordem>('maior');

  readonly ordens = ORDENS;
  readonly brl = brl;
  readonly diaMes = diaMes;
  readonly inicial = inicial;

  readonly totalGeral = computed(() => this.devedores().reduce((soma, d) => soma + d.devido, 0));

  readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');
    const lista = this.devedores().filter((d) => !termo || d.nome.toLocaleLowerCase('pt-BR').includes(termo));
    switch (this.ordem()) {
      case 'maior':
        return lista.sort((a, b) => b.devido - a.devido || porNome(a, b));
      case 'menor':
        return lista.sort((a, b) => a.devido - b.devido || porNome(a, b));
      case 'atraso':
        return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento) || porNome(a, b));
      default:
        return lista.sort(porNome);
    }
  });

  private sequencia = 0;

  constructor() {
    effect(() => {
      this.servico.versao();
      untracked(() => void this.carregar());
    });
  }

  async carregar(): Promise<void> {
    const minhaVez = ++this.sequencia;
    this.carregando.set(true);
    this.erro.set('');
    try {
      const parcelas = await this.servico.listar(false);
      if (minhaVez !== this.sequencia) return;
      const porCliente = new Map<string, Devedor>();
      for (const p of parcelas) {
        const chave = p.cliente_id || p.cliente_nome;
        const atual =
          porCliente.get(chave) ??
          { id: p.cliente_id, nome: p.cliente_nome, telefone: p.cliente_telefone, devido: 0, atrasado: 0, qtd: 0, vencimento: p.vencimento_efetivo };
        atual.devido += p.restante;
        atual.qtd += 1;
        if (p.estado === 'atrasado') atual.atrasado += p.restante;
        if (p.vencimento_efetivo < atual.vencimento) atual.vencimento = p.vencimento_efetivo;
        porCliente.set(chave, atual);
      }
      this.devedores.set([...porCliente.values()].filter((d) => d.devido > 0));
    } catch (e) {
      if (minhaVez === this.sequencia) this.erro.set(mensagemDeErro(e));
    } finally {
      if (minhaVez === this.sequencia) this.carregando.set(false);
    }
  }
}
