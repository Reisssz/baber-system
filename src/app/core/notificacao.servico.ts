import { Injectable, signal } from '@angular/core';

export interface Aviso {
  tipo: 'erro' | 'sucesso';
  texto: string;
}

const DURACAO_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class NotificacaoServico {
  readonly aviso = signal<Aviso | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  erro(texto: string): void {
    this.exibir({ tipo: 'erro', texto });
  }

  sucesso(texto: string): void {
    this.exibir({ tipo: 'sucesso', texto });
  }

  fechar(): void {
    clearTimeout(this.temporizador);
    this.aviso.set(null);
  }

  private exibir(aviso: Aviso): void {
    clearTimeout(this.temporizador);
    this.aviso.set(aviso);
    this.temporizador = setTimeout(() => this.aviso.set(null), DURACAO_MS);
  }
}
