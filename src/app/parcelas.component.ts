import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemDeErro } from './core/erros';
import { brl, diaMes, diasAte, hoje, inicial, linkDeTelefone, linkDoMapa } from './core/formatadores';
import type { EstadoParcela, Parcela } from './core/modelos';
import { NotificacaoServico } from './core/notificacao.servico';
import { ParcelasServico } from './core/parcelas.servico';
import { IconeComponent } from './icone.component';

const GRUPOS: { k: EstadoParcela; t: string }[] = [
  { k: 'atrasado', t: 'Atrasadas' },
  { k: 'hoje', t: 'Cobrar hoje' },
  { k: 'proxima', t: 'Próximas' },
  { k: 'adiado', t: 'Adiadas' },
];

@Component({
  selector: 'app-parcelas',
  imports: [FormsModule, IconeComponent],
  template: `
    @if (mostrarResumo() && !carregando() && !erro()) {
      <section class="resumo" aria-label="Resumo">
        <div class="stat" data-tom="atrasado">
          <span>Em atraso</span><strong>{{ brl(resumo().atrasado.total) }}</strong><small>{{ resumo().atrasado.qtd }} parcela(s)</small>
        </div>
        <div class="stat" data-tom="hoje">
          <span>Cobrar hoje</span><strong>{{ brl(resumo().hoje.total) }}</strong><small>{{ resumo().hoje.qtd }} parcela(s)</small>
        </div>
        <div class="stat" data-tom="receber">
          <span>A receber</span><strong>{{ brl(resumo().receber.total) }}</strong><small>{{ resumo().receber.qtd }} parcela(s)</small>
        </div>
      </section>
    }

    @if (carregando()) {
      <div class="esqueleto" role="status" aria-label="Carregando parcelas"><i></i><i></i><i></i></div>
    } @else if (erro()) {
      <div class="cartao" role="alert">
        <p class="erro-texto">{{ erro() }}</p>
        <button class="btn" style="margin-top: 12px" (click)="carregar()">Tentar novamente</button>
      </div>
    } @else if (!linhas().length) {
      <div class="vazio">
        <app-icone nome="check" />
        <p>Nenhuma parcela por aqui. Cadastre um pagamento na aba Pagamentos.</p>
      </div>
    }

    @for (g of grupos(); track g.k) {
      @if (g.itens.length) {
        <section class="grupo" [attr.data-estado]="g.k">
          <h2 class="grupo-titulo"><i></i>{{ g.t }}<small>{{ g.itens.length }}</small></h2>
          <div class="lista">
            @for (i of g.itens; track i.id) {
              <article class="parcela" [attr.data-estado]="i.estado">
                <div class="parcela-topo">
                  <div class="avatar" aria-hidden="true">{{ inicial(i.cliente_nome) }}</div>
                  <div class="parcela-info">
                    <h3>{{ i.cliente_nome }}</h3>
                    <p class="endereco"><app-icone nome="pin" /><span>{{ i.cliente_endereco || 'Sem endereço cadastrado' }}</span></p>
                  </div>
                  <span class="badge">{{ rotulo(i) }}</span>
                </div>

                <div class="parcela-meio">
                  <strong class="valor">{{ brl(i.status === 'pago' ? i.amount : i.restante) }}</strong>
                  <span class="meta">
                    Parcela {{ i.number }} · vence {{ diaMes(i.vencimento_efetivo) }}
                    @if (i.descricao) { <br />{{ i.descricao }} }
                  </span>
                </div>

                @if (i.status !== 'pago' && i.paid_amount > 0) {
                  <div class="progresso" role="progressbar" [attr.aria-valuenow]="progresso(i)" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="progresso(i)"></i></div>
                  <p class="legenda-progresso">Já pago {{ brl(i.paid_amount) }} de {{ brl(i.amount) }}</p>
                }

                <div class="acoes">
                  @if (i.cliente_endereco) {
                    <a class="btn suave" [href]="linkDoMapa(i.cliente_endereco)" target="_blank" rel="noopener noreferrer"><app-icone nome="navegacao" />Rota</a>
                  }
                  @if (i.cliente_telefone) {
                    <a class="btn suave" [href]="linkDeTelefone(i.cliente_telefone)"><app-icone nome="telefone" />Ligar</a>
                  }
                  @if (i.status !== 'pago') {
                    <button class="btn" (click)="abrir(i)" [attr.aria-expanded]="selecionada() === i.id">Dar baixa</button>
                  }
                </div>

                @if (selecionada() === i.id) {
                  <div class="painel">
                    <div class="bloco">
                      <h4>Registrar pagamento</h4>
                      <div class="linha">
                        <label class="campo">Valor recebido (R$)
                          <input type="number" inputmode="decimal" [(ngModel)]="valor" step="0.01" min="0.01" [max]="i.restante" />
                        </label>
                        <button class="btn borda" (click)="valor = i.restante" type="button">Total</button>
                      </div>
                      <button class="btn ok" (click)="pagar(i)" [disabled]="ocupado()"><app-icone nome="check" />Confirmar pagamento</button>
                    </div>
                    <div class="bloco">
                      <h4>Adiar cobrança</h4>
                      <label class="campo">Nova data
                        <input type="date" [(ngModel)]="data" [min]="hoje()" />
                      </label>
                      <button class="btn aviso" (click)="adiar(i)" [disabled]="ocupado() || !data"><app-icone nome="relogio" />Adiar parcela</button>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </section>
      }
    }
  `,
})
export class ParcelasComponent {
  readonly mostrarPagas = input(false);
  readonly mostrarResumo = input(false);

  private readonly servico = inject(ParcelasServico);
  private readonly avisos = inject(NotificacaoServico);

  readonly linhas = signal<Parcela[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');
  readonly selecionada = signal<string | null>(null);
  readonly ocupado = signal(false);

  valor = 0;
  data = '';

  readonly brl = brl;
  readonly diaMes = diaMes;
  readonly hoje = hoje;
  readonly inicial = inicial;
  readonly linkDoMapa = linkDoMapa;
  readonly linkDeTelefone = linkDeTelefone;

  readonly grupos = computed(() => {
    const definicao = this.mostrarPagas() ? [...GRUPOS, { k: 'pago' as const, t: 'Pagas' }] : GRUPOS;
    const linhas = this.linhas();
    return definicao.map((grupo) => ({ ...grupo, itens: linhas.filter((linha) => linha.estado === grupo.k) }));
  });

  readonly resumo = computed(() => {
    const total = (estados: EstadoParcela[]) => {
      const itens = this.linhas().filter((linha) => estados.includes(linha.estado));
      return { qtd: itens.length, total: itens.reduce((soma, linha) => soma + linha.restante, 0) };
    };
    return { atrasado: total(['atrasado']), hoje: total(['hoje']), receber: total(['proxima', 'adiado']) };
  });

  private sequencia = 0;

  constructor() {
    effect(() => {
      this.servico.versao();
      this.mostrarPagas();
      untracked(() => void this.carregar());
    });
  }

  async carregar(): Promise<void> {
    const minhaVez = ++this.sequencia;
    this.carregando.set(true);
    this.erro.set('');
    try {
      const linhas = await this.servico.listar(this.mostrarPagas());
      if (minhaVez === this.sequencia) this.linhas.set(linhas);
    } catch (e) {
      if (minhaVez === this.sequencia) this.erro.set(mensagemDeErro(e));
    } finally {
      if (minhaVez === this.sequencia) this.carregando.set(false);
    }
  }

  rotulo(parcela: Parcela): string {
    const dias = diasAte(parcela.vencimento_efetivo);
    switch (parcela.estado) {
      case 'pago':
        return 'Paga';
      case 'atrasado':
        return `Atrasada há ${-dias} ${dias === -1 ? 'dia' : 'dias'}`;
      case 'hoje':
        return 'Vence hoje';
      case 'adiado':
        return `Adiada para ${diaMes(parcela.vencimento_efetivo)}`;
      default:
        return dias === 1 ? 'Amanhã' : `Em ${dias} dias`;
    }
  }

  progresso(parcela: Parcela): number {
    return Math.min(100, Math.round((parcela.paid_amount / parcela.amount) * 100));
  }

  abrir(parcela: Parcela): void {
    this.selecionada.update((atual) => (atual === parcela.id ? null : parcela.id));
    this.valor = parcela.restante;
    this.data = parcela.vencimento_efetivo < hoje() ? hoje() : parcela.vencimento_efetivo;
  }

  async pagar(parcela: Parcela): Promise<void> {
    const valor = Math.round(Number(this.valor) * 100) / 100;
    if (!(valor > 0) || valor > parcela.restante) {
      this.avisos.erro(`Informe um valor entre R$ 0,01 e ${brl(parcela.restante)}.`);
      return;
    }
    await this.executar(() => this.servico.pagar(parcela.id, valor), 'Pagamento registrado.');
  }

  async adiar(parcela: Parcela): Promise<void> {
    await this.executar(() => this.servico.adiar(parcela.id, this.data), 'Parcela adiada.');
  }

  private async executar(acao: () => Promise<void>, sucesso: string): Promise<void> {
    this.ocupado.set(true);
    try {
      await acao();
      this.selecionada.set(null);
      this.avisos.sucesso(sucesso);
    } catch (e) {
      this.avisos.erro(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
