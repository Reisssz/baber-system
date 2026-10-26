import { environment } from '../../environments/environment';
import { brl, diasAte } from './formatadores';
import type { Parcela } from './modelos';

const dataCompleta = (data: string): string => data.split('-').reverse().join('/');

const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? '';

const linhaPix = (): string => (environment.pixChave.trim() ? `\n\nPague via Pix:\nChave: ${environment.pixChave.trim()}` : '');

export function mensagemDeCobranca(parcela: Parcela): string {
  const dias = diasAte(parcela.vencimento_efetivo);
  const situacao =
    dias < 0
      ? `está em atraso desde ${dataCompleta(parcela.vencimento_efetivo)}`
      : dias === 0
        ? 'vence hoje'
        : `vence em ${dataCompleta(parcela.vencimento_efetivo)}`;
  const descricao = parcela.descricao ? ` (${parcela.descricao})` : '';
  return (
    `Olá, ${primeiroNome(parcela.cliente_nome)}! Passando para lembrar que a parcela ${parcela.number}${descricao} ${situacao}.\n\n` +
    `Valor: ${brl(parcela.restante)}` +
    linhaPix() +
    '\n\nQuando fizer o pagamento, por favor envie o comprovante. Obrigado!'
  );
}

export function mensagemDeCobrancaTotal(nome: string, abertas: Parcela[]): string {
  const total = abertas.reduce((soma, parcela) => soma + parcela.restante, 0);
  const atrasadas = abertas.filter((parcela) => parcela.estado === 'atrasado');
  const detalhe = atrasadas.length ? ` (${atrasadas.length} em atraso)` : '';
  return (
    `Olá, ${primeiroNome(nome)}! Você possui ${abertas.length} parcela(s) em aberto${detalhe}.\n\n` +
    `Valor total: ${brl(total)}` +
    linhaPix() +
    '\n\nQuando fizer o pagamento, por favor envie o comprovante. Obrigado!'
  );
}

/** Assume Brasil (+55) quando o número vem sem código do país. */
export function linkDoWhatsapp(telefone: string, mensagem: string): string {
  let numero = telefone.replace(/\D/g, '');
  if (numero.length <= 11) numero = '55' + numero.replace(/^0+/, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
