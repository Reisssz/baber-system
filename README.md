# Barbearia · Gestão (Angular + Supabase)

Controle de pagamentos parcelados (cobranças, atrasos, baixas totais ou parciais, adiamentos) e de estoque (principal e carro).

## Iniciar
1. No Supabase, rode `supabase/schema.sql` no **SQL Editor**.
2. Em **Authentication > Users**, crie o usuário do dono (marque "Auto Confirm User") e, em **Sign In / Providers**, desative o cadastro público.
3. Em `src/environments/environment.ts`, informe a URL e a chave anon (Project Settings > API).
4. `npm install`
5. `npm run dev` e abra http://localhost:4200
