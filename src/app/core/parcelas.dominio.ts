import type { EstadoParcela, Parcela, ParcelaBruta } from './modelos';

const emCentavos = (valor: number): number => Math.round(valor * 100);

export const vencimentoEfetivo = (parcela: { due_date: string; postponed_to: string | null }): string =>
  parcela.postponed_to ?? parcela.due_date;

export const saldoRestante = (parcela: { amount: number; paid_amount: number }): number =>
  (emCentavos(parcela.amount) - emCentavos(parcela.paid_amount)) / 100;

export function estadoDaParcela(
  parcela: { due_date: string; postponed_to: string | null; status: string },
  hoje: string,
): EstadoParcela {
  if (parcela.status === 'pago') return 'pago';
  const vencimento = vencimentoEfetivo(parcela);
  if (vencimento < hoje) return 'atrasado';
  if (vencimento === hoje) return 'hoje';
  return parcela.postponed_to ? 'adiado' : 'proxima';
}

export function detalharParcela(bruta: ParcelaBruta, hoje: string): Parcela {
  const cliente = bruta.sales?.clients;
  return {
    id: bruta.id,
    sale_id: bruta.sale_id,
    number: bruta.number,
    due_date: bruta.due_date,
    postponed_to: bruta.postponed_to,
    amount: bruta.amount,
    paid_amount: bruta.paid_amount,
    status: bruta.status,
    descricao: bruta.sales?.description ?? '',
    cliente_id: bruta.sales?.client_id ?? '',
    cliente_nome: cliente?.name ?? '(cliente removido)',
    cliente_endereco: cliente?.address ?? '',
    cliente_telefone: cliente?.phone ?? '',
    vencimento_efetivo: vencimentoEfetivo(bruta),
    restante: saldoRestante(bruta),
    estado: estadoDaParcela(bruta, hoje),
  };
}

/** Pendentes primeiro; dentro de cada grupo, vencimento mais próximo primeiro. */
export function ordenarParcelas(a: Parcela, b: Parcela): number {
  const pagaA = a.status === 'pago' ? 1 : 0;
  const pagaB = b.status === 'pago' ? 1 : 0;
  return (
    pagaA - pagaB ||
    a.vencimento_efetivo.localeCompare(b.vencimento_efetivo) ||
    a.cliente_nome.localeCompare(b.cliente_nome, 'pt-BR') ||
    a.number - b.number
  );
}
