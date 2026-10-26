import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { mensagemDeErro } from './core/erros';
import { brl, diaMes, hoje, inicial, linkDoMapa } from './core/formatadores';
import type { Parcela } from './core/modelos';
import { ParcelasServico } from './core/parcelas.servico';
import { linkDoWhatsapp, mensagemDeCobrancaTotal } from './core/whatsapp';
import { IconeComponent } from './icone.component';

@Component({
  selector: 'app-cliente-perfil',
  imports: [IconeComponent],
  host: { '(document:keydown.escape)': 'fechar.emit()' },
  template: `
    <div class="modal-fundo" (click)="fechar.emit()">
      <section class="modal perfil" role="dialog" aria-modal="true" aria-label="Perfil do cliente" (click)="$event.stopPropagation()">
        <button class="btn borda icone modal-fechar" type="button" (click)="fechar.emit()" aria-label="Fechar">×</button>

        @if (carregando()) {
          <div class="esqueleto" role="status" aria-label="Carregando perfil"><i></i></div>
        } @else if (erro()) {
          <p class="erro-texto" role="alert">{{ erro() }}</p>
        } @else if (dados(); as d) {
          <header class="perfil-topo">
            <div class="avatar" aria-hidden="true">{{ inicial(d.nome) }}</div>
            <div class="parcela-info">
              <h2>{{ d.nome }}</h2>
              @if (d.telefone) { <p class="endereco"><app-icone nome="telefone" /><span>{{ d.telefone }}</span></p> }
              <p class="endereco"><app-icone nome="pin" /><span>{{ d.endereco || 'Sem endereço cadastrado' }}</span></p>
            </div>
          </header>

          <div class="acoes">
            @if (d.telefone && d.abertas.length) {
              <a class="btn whatsapp" [href]="d.whatsapp" target="_blank" rel="noopener noreferrer"><app-icone nome="whatsapp" />Cobrar no WhatsApp</a>
            }
            @if (d.endereco) {
              <a class="btn suave" [href]="linkDoMapa(d.endereco)" target="_blank" rel="noopener noreferrer"><app-icone nome="navegacao" />Rota</a>
            }
          </div>

          <div class="perfil-numeros">
            <div class="stat" data-tom="atrasado"><span>Total devido</span><strong>{{ brl(d.devido) }}</strong><small>{{ d.abertas.length }} parcela(s) em aberto</small></div>
            <div class="stat" data-tom="atrasado"><span>Em atraso</span><strong>{{ brl(d.atrasado) }}</strong><small>{{ d.qtdAtrasadas }} parcela(s)</small></div>
            <div class="stat" data-tom="receber"><span>Já pago</span><strong>{{ brl(d.pago) }}</strong><small>de {{ brl(d.contratado) }} contratados</small></div>
            <div class="stat" data-tom="hoje"><span>Próximo vencimento</span><strong>{{ d.proximo ? diaMes(d.proximo) : '—' }}</strong><small>{{ d.compras }} compra(s) no total</small></div>
          </div>

          <h3 class="perfil-secao">Parcelas</h3>
          <ul class="perfil-lista">
            @for (p of d.parcelas; track p.id) {
              <li [attr.data-estado]="p.estado">
                <div>
                  <strong>Parcela {{ p.number }} · vence {{ diaMes(p.vencimento_efetivo) }}</strong>
                  @if (p.descricao) { <small>{{ p.descricao }}</small> }
                </div>
                <span class="badge">{{ p.estado === 'pago' ? 'Paga' : brl(p.restante) }}</span>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class ClientePerfilComponent {
  readonly clienteId = input.required<string>();
  readonly fechar = output<void>();

  private readonly servico = inject(ParcelasServico);

  readonly parcelas = signal<Parcela[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');

  readonly brl = brl;
  readonly diaMes = diaMes;
  readonly inicial = inicial;
  readonly linkDoMapa = linkDoMapa;

  readonly dados = computed(() => {
    const parcelas = this.parcelas();
    const primeira = parcelas[0];
    if (!primeira) return null;
    const abertas = parcelas.filter((p) => p.status !== 'pago');
    const atrasadas = abertas.filter((p) => p.estado === 'atrasado');
    const soma = (itens: Parcela[], valor: (p: Parcela) => number) => itens.reduce((total, p) => total + valor(p), 0);
    return {
      nome: primeira.cliente_nome,
      telefone: primeira.cliente_telefone,
      endereco: primeira.cliente_endereco,
      parcelas,
      abertas,
      devido: soma(abertas, (p) => p.restante),
      atrasado: soma(atrasadas, (p) => p.restante),
      qtdAtrasadas: atrasadas.length,
      pago: soma(parcelas, (p) => p.paid_amount),
      contratado: soma(parcelas, (p) => p.amount),
      compras: new Set(parcelas.map((p) => p.sale_id)).size,
      proximo: abertas.map((p) => p.vencimento_efetivo).filter((d) => d >= hoje()).sort()[0] ?? '',
      whatsapp: linkDoWhatsapp(primeira.cliente_telefone, mensagemDeCobrancaTotal(primeira.cliente_nome, abertas)),
    };
  });

  constructor() {
    effect(() => {
      const id = this.clienteId();
      untracked(() => void this.carregar(id));
    });
  }

  private async carregar(id: string): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const todas = await this.servico.listar(true);
      this.parcelas.set(todas.filter((p) => p.cliente_id === id).sort((a, b) => a.due_date.localeCompare(b.due_date) || a.number - b.number));
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
