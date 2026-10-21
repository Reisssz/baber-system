import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemDeErro } from './core/erros';
import { brl } from './core/formatadores';
import type { LocalEstoque, NovoProduto, Produto } from './core/modelos';
import { NotificacaoServico } from './core/notificacao.servico';
import { ProdutosServico } from './core/produtos.servico';
import { IconeComponent } from './icone.component';

const produtoVazio = (): NovoProduto => ({ name: '', price: 0, qty_main: 0, qty_car: 0 });
const ESTOQUE_BAIXO = 3;

@Component({
  selector: 'app-estoque',
  imports: [FormsModule, IconeComponent],
  template: `
    <div class="busca">
      <label>
        <app-icone nome="busca" />
        <input type="search" placeholder="Buscar produto no estoque" aria-label="Buscar produto" autocomplete="off"
               [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
      </label>
    </div>

    @if (carregando()) {
      <div class="esqueleto" role="status" aria-label="Carregando estoque"><i></i><i></i><i></i></div>
    } @else if (erro()) {
      <div class="cartao" role="alert">
        <p class="erro-texto">{{ erro() }}</p>
        <button class="btn" style="margin-top: 12px" (click)="carregar()">Tentar novamente</button>
      </div>
    } @else if (!filtrados().length) {
      <div class="vazio"><app-icone nome="estoque" /><p>Nenhum produto encontrado.</p></div>
    }

    <div class="produtos">
      @for (p of filtrados(); track p.id) {
        <article class="produto">
          <div class="produto-topo">
            <div>
              <h3>{{ p.name }}</h3>
              <p class="preco">{{ brl(p.price) }} · {{ p.qty_main + p.qty_car }} no total</p>
            </div>
            @if (situacao(p); as s) { <span class="badge" [attr.data-estado]="s.estado">{{ s.rotulo }}</span> }
          </div>

          <div class="compartimentos">
            <div class="compartimento">
              <span class="nome"><app-icone nome="estoque" />Principal</span>
              <strong class="qtd" [class.zero]="!p.qty_main">{{ p.qty_main }}</strong>
              <div class="passo">
                <button class="btn borda icone" (click)="mover(p, 'principal', -1)" [disabled]="ocupadoId() === p.id || !p.qty_main" aria-label="Retirar 1 do estoque principal"><app-icone nome="menos" /></button>
                <button class="btn suave icone" (click)="mover(p, 'principal', 1)" [disabled]="ocupadoId() === p.id" aria-label="Adicionar 1 ao estoque principal"><app-icone nome="mais" /></button>
              </div>
            </div>
            <div class="compartimento">
              <span class="nome"><app-icone nome="carro" />Carro</span>
              <strong class="qtd" [class.zero]="!p.qty_car">{{ p.qty_car }}</strong>
              <div class="passo">
                <button class="btn borda icone" (click)="mover(p, 'carro', -1)" [disabled]="ocupadoId() === p.id || !p.qty_car" aria-label="Retirar 1 do carro"><app-icone nome="menos" /></button>
                <button class="btn suave icone" (click)="mover(p, 'carro', 1)" [disabled]="ocupadoId() === p.id" aria-label="Adicionar 1 ao carro"><app-icone nome="mais" /></button>
              </div>
            </div>
          </div>

          <div class="transferencias">
            <button class="btn borda" (click)="transferir(p, 'principal', 'carro')" [disabled]="ocupadoId() === p.id || !p.qty_main"><app-icone nome="transferir" />Principal → carro</button>
            <button class="btn borda" (click)="transferir(p, 'carro', 'principal')" [disabled]="ocupadoId() === p.id || !p.qty_car"><app-icone nome="transferir" />Carro → principal</button>
          </div>
        </article>
      }
    </div>

    <section class="cartao">
      <h2>Novo produto</h2>
      <div class="grade-campos">
        <label class="campo">Nome <input maxlength="120" [(ngModel)]="novo.name" /></label>
        <label class="campo">Preço (R$) <input type="number" inputmode="decimal" min="0" step="0.01" [(ngModel)]="novo.price" /></label>
        <label class="campo">Qtd. estoque principal <input type="number" inputmode="numeric" min="0" step="1" [(ngModel)]="novo.qty_main" /></label>
        <label class="campo">Qtd. no carro <input type="number" inputmode="numeric" min="0" step="1" [(ngModel)]="novo.qty_car" /></label>
      </div>
      <div class="rodape-form">
        <button class="btn ok grande" (click)="cadastrar()" [disabled]="!novoValido() || cadastrando()">
          <app-icone nome="mais" />{{ cadastrando() ? 'Cadastrando…' : 'Cadastrar produto' }}
        </button>
      </div>
    </section>
  `,
})
export class EstoqueComponent {
  private readonly servico = inject(ProdutosServico);
  private readonly avisos = inject(NotificacaoServico);

  readonly brl = brl;
  readonly busca = signal('');
  readonly itens = signal<Produto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal('');
  readonly ocupadoId = signal<string | null>(null);
  readonly cadastrando = signal(false);
  novo = produtoVazio();

  readonly filtrados = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    return this.itens().filter((produto) => produto.name.toLowerCase().includes(termo));
  });

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');
    try {
      this.itens.set(await this.servico.listar());
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.carregando.set(false);
    }
  }

  situacao(produto: Produto): { estado: 'atrasado' | 'adiado'; rotulo: string } | null {
    const total = produto.qty_main + produto.qty_car;
    if (total === 0) return { estado: 'atrasado', rotulo: 'Sem estoque' };
    if (total <= ESTOQUE_BAIXO) return { estado: 'adiado', rotulo: 'Estoque baixo' };
    return null;
  }

  mover(produto: Produto, local: LocalEstoque, variacao: number): Promise<void> {
    return this.atualizar(produto, () => this.servico.movimentar(produto.id, local, variacao));
  }

  transferir(produto: Produto, de: LocalEstoque, para: LocalEstoque): Promise<void> {
    return this.atualizar(produto, () => this.servico.transferir(produto.id, de, para));
  }

  novoValido(): boolean {
    const { name, price, qty_main, qty_car } = this.novo;
    return (
      name.trim().length > 0 &&
      Number(price) >= 0 &&
      Number.isInteger(Number(qty_main)) && Number(qty_main) >= 0 &&
      Number.isInteger(Number(qty_car)) && Number(qty_car) >= 0
    );
  }

  async cadastrar(): Promise<void> {
    if (!this.novoValido()) return;
    this.cadastrando.set(true);
    try {
      const { name, price, qty_main, qty_car } = this.novo;
      const criado = await this.servico.criar({
        name: name.trim(),
        price: Math.round(Number(price) * 100) / 100,
        qty_main: Number(qty_main),
        qty_car: Number(qty_car),
      });
      this.itens.update((lista) => [...lista, criado].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      this.novo = produtoVazio();
      this.avisos.sucesso('Produto cadastrado.');
    } catch (e) {
      this.avisos.erro(mensagemDeErro(e));
    } finally {
      this.cadastrando.set(false);
    }
  }

  private async atualizar(produto: Produto, acao: () => Promise<Produto>): Promise<void> {
    this.ocupadoId.set(produto.id);
    try {
      const atualizado = await acao();
      this.itens.update((lista) => lista.map((item) => (item.id === atualizado.id ? atualizado : item)));
    } catch (e) {
      this.avisos.erro(mensagemDeErro(e));
    } finally {
      this.ocupadoId.set(null);
    }
  }
}
