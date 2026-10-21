-- Rode este arquivo inteiro no Supabase > SQL Editor. É idempotente (pode ser executado de novo).

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  address text default '',
  phone text default '',
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete restrict,
  description text default '',
  total numeric(12,2) not null check (total > 0),
  created_at timestamptz default now()
);

create table if not exists installments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales on delete cascade,
  number int not null,
  due_date date not null,
  postponed_to date,
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'pago'))
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  price numeric(12,2) default 0,
  qty_main int not null default 0 check (qty_main >= 0),
  qty_car int not null default 0 check (qty_car >= 0),
  created_at timestamptz default now()
);

-- "not valid" aplica a regra apenas a dados novos, sem falhar por registros antigos.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'installments_amount_positivo') then
    alter table installments add constraint installments_amount_positivo check (amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'installments_paid_valido') then
    alter table installments add constraint installments_paid_valido check (paid_amount >= 0 and paid_amount <= amount) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'installments_sale_number_uk') then
    alter table installments add constraint installments_sale_number_uk unique (sale_id, number);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_price_valido') then
    alter table products add constraint products_price_valido check (price >= 0) not valid;
  end if;
end $$;

create index if not exists installments_status_due_idx on installments (status, due_date);
create index if not exists installments_sale_idx on installments (sale_id);
create index if not exists sales_client_idx on sales (client_id);
create index if not exists clients_name_lower_idx on clients (lower(name));

-- Acesso somente para usuários autenticados. Desative o cadastro público em Authentication > Sign In / Providers.
do $$ declare t text; begin
  foreach t in array array['clients', 'sales', 'installments', 'products'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner" on %I', t);
    execute format('create policy "owner" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Cria cliente (ou reaproveita pelo nome), venda e parcelas em uma única transação.
-- O total é dividido em centavos exatos; as primeiras parcelas absorvem a sobra.
create or replace function criar_pagamento(
  p_nome text, p_endereco text, p_telefone text, p_descricao text,
  p_total numeric, p_parcelas int, p_primeiro_vencimento date
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
  v_cliente uuid;
  v_venda uuid;
  v_centavos bigint;
  v_base bigint;
  v_resto bigint;
  v_dia int;
  v_mes_inicial date;
  v_mes date;
  v_ultimo_dia int;
  k int;
begin
  if v_nome = '' then raise exception 'Informe o cliente.' using errcode = '22023'; end if;
  if p_total is null or p_total <= 0 then raise exception 'O valor total deve ser maior que zero.' using errcode = '22023'; end if;
  if p_total <> round(p_total, 2) then raise exception 'Use no máximo 2 casas decimais no valor total.' using errcode = '22023'; end if;
  if p_parcelas is null or p_parcelas < 1 or p_parcelas > 60 then raise exception 'O número de parcelas deve estar entre 1 e 60.' using errcode = '22023'; end if;
  if p_primeiro_vencimento is null then raise exception 'Informe o primeiro vencimento.' using errcode = '22023'; end if;

  select id into v_cliente from clients where lower(name) = lower(v_nome) order by created_at limit 1;
  if v_cliente is null then
    insert into clients (name, address, phone)
    values (v_nome, btrim(coalesce(p_endereco, '')), btrim(coalesce(p_telefone, '')))
    returning id into v_cliente;
  else
    update clients
       set address = coalesce(nullif(btrim(p_endereco), ''), address),
           phone = coalesce(nullif(btrim(p_telefone), ''), phone)
     where id = v_cliente;
  end if;

  insert into sales (client_id, description, total)
  values (v_cliente, btrim(coalesce(p_descricao, '')), p_total)
  returning id into v_venda;

  v_centavos := round(p_total * 100);
  v_base := v_centavos / p_parcelas;
  v_resto := v_centavos % p_parcelas;
  v_dia := extract(day from p_primeiro_vencimento)::int;
  v_mes_inicial := p_primeiro_vencimento - (v_dia - 1);

  for k in 1..p_parcelas loop
    v_mes := (v_mes_inicial + make_interval(months => k - 1))::date;
    v_ultimo_dia := extract(day from (v_mes + interval '1 month' - interval '1 day'))::int;
    insert into installments (sale_id, number, due_date, amount)
    values (v_venda, k, v_mes + (least(v_dia, v_ultimo_dia) - 1), (v_base + case when k <= v_resto then 1 else 0 end) / 100.0);
  end loop;

  return v_venda;
end $$;

-- Registra pagamento total ou parcial, com a linha travada contra baixas simultâneas.
create or replace function registrar_pagamento(p_parcela uuid, p_valor numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  v installments;
  v_novo numeric;
begin
  if p_valor is null or round(p_valor, 2) <= 0 then raise exception 'Informe um valor maior que zero.' using errcode = '22023'; end if;

  select * into v from installments where id = p_parcela for update;
  if not found then raise exception 'Parcela não encontrada.' using errcode = 'P0002'; end if;
  if v.status = 'pago' then raise exception 'Esta parcela já está quitada.' using errcode = 'P0001'; end if;

  v_novo := v.paid_amount + round(p_valor, 2);
  if v_novo > v.amount then
    raise exception 'O valor excede o saldo da parcela (restam R$ %).', (v.amount - v.paid_amount) using errcode = '22023';
  end if;

  update installments
     set paid_amount = v_novo,
         status = case when v_novo >= v.amount then 'pago' else 'pendente' end
   where id = p_parcela;
end $$;

create or replace function adiar_parcela(p_parcela uuid, p_data date)
returns void
language plpgsql
set search_path = public
as $$
declare
  v installments;
begin
  if p_data is null then raise exception 'Informe a nova data.' using errcode = '22023'; end if;
  if p_data < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'A nova data não pode estar no passado.' using errcode = '22023'; end if;

  select * into v from installments where id = p_parcela for update;
  if not found then raise exception 'Parcela não encontrada.' using errcode = 'P0002'; end if;
  if v.status = 'pago' then raise exception 'Parcelas quitadas não podem ser adiadas.' using errcode = 'P0001'; end if;

  update installments set postponed_to = p_data where id = p_parcela;
end $$;

-- p_local: 'principal' ou 'carro'. Saldo negativo é barrado pela constraint da tabela.
create or replace function mover_estoque(p_produto uuid, p_local text, p_variacao int)
returns products
language plpgsql
set search_path = public
as $$
declare
  v products;
begin
  if p_variacao is null or p_variacao = 0 then raise exception 'A variação não pode ser zero.' using errcode = '22023'; end if;

  if p_local = 'principal' then
    update products set qty_main = qty_main + p_variacao where id = p_produto returning * into v;
  elsif p_local = 'carro' then
    update products set qty_car = qty_car + p_variacao where id = p_produto returning * into v;
  else
    raise exception 'Local de estoque inválido.' using errcode = '22023';
  end if;

  if v.id is null then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
  return v;
end $$;

create or replace function transferir_estoque(p_produto uuid, p_de text, p_para text, p_quantidade int default 1)
returns products
language plpgsql
set search_path = public
as $$
declare
  v products;
  v_delta_principal int;
begin
  if p_de not in ('principal', 'carro') or p_para not in ('principal', 'carro') or p_de = p_para then
    raise exception 'Origem e destino da transferência inválidos.' using errcode = '22023';
  end if;
  if p_quantidade is null or p_quantidade < 1 then raise exception 'A quantidade deve ser ao menos 1.' using errcode = '22023'; end if;

  v_delta_principal := case when p_de = 'principal' then -p_quantidade else p_quantidade end;

  update products
     set qty_main = qty_main + v_delta_principal,
         qty_car = qty_car - v_delta_principal
   where id = p_produto
  returning * into v;

  if v.id is null then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
  return v;
end $$;

revoke all on function criar_pagamento(text, text, text, text, numeric, int, date) from public, anon;
revoke all on function registrar_pagamento(uuid, numeric) from public, anon;
revoke all on function adiar_parcela(uuid, date) from public, anon;
revoke all on function mover_estoque(uuid, text, int) from public, anon;
revoke all on function transferir_estoque(uuid, text, text, int) from public, anon;
grant execute on function criar_pagamento(text, text, text, text, numeric, int, date) to authenticated;
grant execute on function registrar_pagamento(uuid, numeric) to authenticated;
grant execute on function adiar_parcela(uuid, date) to authenticated;
grant execute on function mover_estoque(uuid, text, int) to authenticated;
grant execute on function transferir_estoque(uuid, text, text, int) to authenticated;

notify pgrst, 'reload schema';
