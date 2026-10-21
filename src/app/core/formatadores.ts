const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl = (valor: number): string => formatadorMoeda.format(valor);

export const hoje = (): string => new Date().toLocaleDateString('sv-SE');

export const diaMes = (data: string): string => data.split('-').reverse().slice(0, 2).join('/');

export const linkDoMapa = (endereco: string): string =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(endereco);

export const linkDeTelefone = (telefone: string): string => 'tel:' + telefone.replace(/[^\d+]/g, '');

export const inicial = (nome: string): string => nome.trim().charAt(0).toUpperCase() || '?';

/** Dias de calendário entre hoje e a data (negativo = no passado). */
export function diasAte(data: string): number {
  const [ano = 0, mes = 1, dia = 1] = data.split('-').map(Number);
  const [anoHoje = 0, mesHoje = 1, diaHoje = 1] = hoje().split('-').map(Number);
  return Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(anoHoje, mesHoje - 1, diaHoje)) / 86_400_000);
}

export function previaDasParcelas(total: number, quantidade: number): string {
  const totalCentavos = Math.round(total * 100);
  if (!(totalCentavos > 0) || !Number.isInteger(quantidade) || quantidade < 1) return '';
  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - base * quantidade;
  if (resto === 0) return `${quantidade}x de ${brl(base / 100)}`;
  return `${resto}x de ${brl((base + 1) / 100)} e ${quantidade - resto}x de ${brl(base / 100)}`;
}
