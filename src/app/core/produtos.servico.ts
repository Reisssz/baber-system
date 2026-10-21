import { Injectable } from '@angular/core';
import type { LocalEstoque, NovoProduto, Produto } from './modelos';
import { resolver, supabase } from './supabase';

@Injectable({ providedIn: 'root' })
export class ProdutosServico {
  async listar(): Promise<Produto[]> {
    const produtos = await resolver(supabase.from('products').select('*').order('name').limit(1000));
    return produtos as Produto[];
  }

  async criar(produto: NovoProduto): Promise<Produto> {
    const criado = await resolver(supabase.from('products').insert(produto).select().single());
    return criado as Produto;
  }

  async movimentar(id: string, local: LocalEstoque, variacao: number): Promise<Produto> {
    const produto = await resolver(
      supabase.rpc('mover_estoque', { p_produto: id, p_local: local, p_variacao: variacao }),
    );
    return produto as Produto;
  }

  async transferir(id: string, de: LocalEstoque, para: LocalEstoque): Promise<Produto> {
    const produto = await resolver(
      supabase.rpc('transferir_estoque', { p_produto: id, p_de: de, p_para: para, p_quantidade: 1 }),
    );
    return produto as Produto;
  }
}
