export type EstadoParcela = 'pago' | 'atrasado' | 'hoje' | 'adiado' | 'proxima';
export type LocalEstoque = 'principal' | 'carro';

export interface Parcela {
  id: string;
  sale_id: string;
  number: number;
  due_date: string;
  postponed_to: string | null;
  amount: number;
  paid_amount: number;
  status: 'pendente' | 'pago';
  descricao: string;
  cliente_nome: string;
  cliente_endereco: string;
  cliente_telefone: string;
  vencimento_efetivo: string;
  restante: number;
  estado: EstadoParcela;
}

export interface Cliente {
  id: string;
  name: string;
  address: string;
  phone: string;
}

/** Linha de `installments` como retornada pelo Supabase, com venda e cliente embutidos. */
export interface ParcelaBruta {
  id: string;
  sale_id: string;
  number: number;
  due_date: string;
  postponed_to: string | null;
  amount: number;
  paid_amount: number;
  status: 'pendente' | 'pago';
  sales: { description: string | null; clients: { name: string; address: string | null; phone: string | null } | null } | null;
}

export interface Produto {
  id: string;
  name: string;
  price: number;
  qty_main: number;
  qty_car: number;
}

export type NovoProduto = Omit<Produto, 'id'>;

export interface NovoPagamento {
  cliente: { nome: string; endereco: string; telefone: string };
  descricao: string;
  total: number;
  parcelas: number;
  primeiro_vencimento: string;
}
