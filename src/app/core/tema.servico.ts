import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'barber.tema';
const CORES_DA_BARRA: Record<Tema, string> = { claro: '#0a1f4d', escuro: '#080f20' };

function lerSalvo(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE);
    return valor === 'claro' || valor === 'escuro' ? valor : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class TemaServico {
  private readonly documento = inject(DOCUMENT);
  private readonly escolhaDoUsuario = signal<Tema | null>(lerSalvo());
  private readonly sistema = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly preferenciaDoSistema = signal<Tema>(this.sistema.matches ? 'escuro' : 'claro');

  readonly tema = () => this.escolhaDoUsuario() ?? this.preferenciaDoSistema();

  constructor() {
    this.sistema.addEventListener('change', (evento) => this.preferenciaDoSistema.set(evento.matches ? 'escuro' : 'claro'));
    effect(() => {
      const tema = this.tema();
      this.documento.documentElement.dataset['tema'] = tema;
      this.documento.querySelector('meta[name="theme-color"]')?.setAttribute('content', CORES_DA_BARRA[tema]);
    });
  }

  alternar(): void {
    const proximo: Tema = this.tema() === 'escuro' ? 'claro' : 'escuro';
    this.escolhaDoUsuario.set(proximo);
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // armazenamento indisponível: a escolha vale apenas nesta sessão
    }
  }
}
