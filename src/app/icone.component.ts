import { Component, input } from '@angular/core';

export type NomeIcone =
  | 'cobrancas'
  | 'pagamentos'
  | 'estoque'
  | 'sair'
  | 'pin'
  | 'telefone'
  | 'whatsapp'
  | 'usuarios'
  | 'busca'
  | 'mais'
  | 'menos'
  | 'transferir'
  | 'check'
  | 'relogio'
  | 'navegacao'
  | 'alerta'
  | 'carro'
  | 'sol'
  | 'lua';

@Component({
  selector: 'app-icone',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (nome()) {
        @case ('cobrancas') { <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" /> }
        @case ('pagamentos') { <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /> }
        @case ('estoque') { <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v9" /> }
        @case ('sair') { <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /> }
        @case ('pin') { <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="3" /> }
        @case ('telefone') { <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /> }
        @case ('whatsapp') { <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z" /> }
        @case ('usuarios') { <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /> }
        @case ('busca') { <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /> }
        @case ('mais') { <path d="M12 5v14M5 12h14" /> }
        @case ('menos') { <path d="M5 12h14" /> }
        @case ('transferir') { <path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" /> }
        @case ('check') { <path d="M20 6L9 17l-5-5" /> }
        @case ('relogio') { <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /> }
        @case ('navegacao') { <path d="M3 11l19-9-9 19-2-8-8-2z" /> }
        @case ('alerta') { <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /> }
        @case ('carro') { <path d="M5 17H3v-5l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 7l2 5v5h-2" /><path d="M3 12h18" /><circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" /> }
        @case ('sol') { <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /> }
        @case ('lua') { <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /> }
      }
    </svg>
  `,
})
export class IconeComponent {
  readonly nome = input.required<NomeIcone>();
}
