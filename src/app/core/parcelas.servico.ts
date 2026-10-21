import { Injectable, signal } from '@angular/core';
import { detalharParcela, ordenarParcelas } from './parcelas.dominio';
import { hoje } from './formatadores';
import type { Cliente, NovoPagamento, Parcela, ParcelaBruta } from './modelos';
import { resolver, supabase } from './supabase';

const LIMITE_DE_PARCELAS = 1000;
const COLUNAS_PARCELA =
  'id, sale_id, number, due_date, postponed_to, amount, paid_amount, status, sales(description, clients(name, address, phone))';

@Injectable({ providedIn: 'root' })
export class ParcelasServico {
  /** Incrementa a cada alteração para que as listas recarreguem. */
  readonly versao = signal(0);

  async listar(incluirPagas: boolean): Promise<Parcela[]> {
    let consulta = supabase.from('installments').select(COLUNAS_PARCELA).order('due_date').limit(LIMITE_DE_PARCELAS);
    if (!incluirPagas) consulta = consulta.neq('status', 'pago');

    const linhas = (await resolver(consulta)) as unknown as ParcelaBruta[];
    const dia = hoje();
    return linhas.map((linha) => detalharParcela(linha, dia)).sort(ordenarParcelas);
  }

  async listarClientes(): Promise<Cliente[]> {
    const clientes = await resolver(supabase.from('clients').select('id, name, address, phone').order('name').limit(1000));
    return clientes as Cliente[];
  }

  async pagar(id: string, valor: number): Promise<void> {
    await resolver(supabase.rpc('registrar_pagamento', { p_parcela: id, p_valor: valor }));
    this.invalidar();
  }

  async adiar(id: string, data: string): Promise<void> {
    await resolver(supabase.rpc('adiar_parcela', { p_parcela: id, p_data: data }));
    this.invalidar();
  }

  async criarPagamento(dados: NovoPagamento): Promise<void> {
    await resolver(
      supabase.rpc('criar_pagamento', {
        p_nome: dados.cliente.nome,
        p_endereco: dados.cliente.endereco,
        p_telefone: dados.cliente.telefone,
        p_descricao: dados.descricao,
        p_total: dados.total,
        p_parcelas: dados.parcelas,
        p_primeiro_vencimento: dados.primeiro_vencimento,
      }),
    );
    this.invalidar();
  }

  private invalidar(): void {
    this.versao.update((versao) => versao + 1);
  }
}
