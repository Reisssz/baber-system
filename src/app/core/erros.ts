export class ErroDeBanco extends Error {
  constructor(
    mensagem: string,
    readonly codigo?: string,
  ) {
    super(mensagem);
    this.name = 'ErroDeBanco';
  }
}

// Erros levantados pelas funções SQL do projeto já trazem mensagem pronta para o usuário.
const CODIGOS_COM_MENSAGEM_PROPRIA = new Set(['22023', 'P0001', 'P0002']);

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroDeBanco && erro.codigo && CODIGOS_COM_MENSAGEM_PROPRIA.has(erro.codigo)) {
    return erro.message;
  }

  const texto = erro instanceof Error ? erro.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(texto)) return 'Sem conexão com o servidor.';
  if (/timeout|aborted/i.test(texto)) return 'O servidor demorou demais para responder.';
  if (/jwt|not authenticated/i.test(texto)) return 'Sessão expirada. Entre novamente.';

  if (erro instanceof ErroDeBanco) {
    switch (erro.codigo) {
      case '23514':
        return 'Os dados violam uma regra do sistema (por exemplo, estoque insuficiente).';
      case '23505':
        return 'Já existe um registro com esses dados.';
      case '42501':
        return 'Sem permissão para esta operação. Entre novamente.';
      default:
        return 'Não foi possível concluir a operação. Tente novamente.';
    }
  }
  return 'Ocorreu um erro inesperado.';
}
