-- 1. Admin Access & Security
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists is_banned boolean default false;

-- Admin check function
create or replace function public.is_admin()
returns boolean as $$
begin
  return (select is_admin from public.profiles where id = auth.uid()) = true;
end;
$$ language plpgsql security definer;

-- RLS policies for admin-only access
alter table public.profiles enable row level security;
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin());
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles for update using (public.is_admin());

alter table public.bets enable row level security;
drop policy if exists "Admins can view all bets" on public.bets;
create policy "Admins can view all bets" on public.bets for select using (public.is_admin());

alter table public.games enable row level security;
drop policy if exists "Admins can view all games" on public.games;
create policy "Admins can view all games" on public.games for select using (public.is_admin());
drop policy if exists "Admins can update games" on public.games;
create policy "Admins can update games" on public.games for update using (public.is_admin());

alter table public.transactions enable row level security;
drop policy if exists "Admins can view all transactions" on public.transactions;
create policy "Admins can view all transactions" on public.transactions for select using (public.is_admin());
drop policy if exists "Admins can update transactions" on public.transactions;
create policy "Admins can update transactions" on public.transactions for update using (public.is_admin());

-- Create App Settings Table
create table if not exists public.app_settings (
  id integer primary key default 1,
  house_commission_percent numeric default 5.0,
  min_bet numeric default 10.0,
  max_bet numeric default 100000.0,
  house_logic_enabled boolean default true,
  updated_at timestamp with time zone default now()
);

-- Ensure only one row exists
insert into public.app_settings (id) values (1) on conflict do nothing;

alter table public.app_settings enable row level security;
create policy "Anyone can read settings" on public.app_settings for select using (true);
create policy "Admins can update settings" on public.app_settings for update using (public.is_admin());

-- 2. Admin RPC Functions (Bypassing CLI requirements)

-- Force a game result
create or replace function public.admin_force_result(
  p_session_type text,
  p_period text,
  p_number int,
  p_color text,
  p_big_small text
)
returns json
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    return json_build_object('error', 'Unauthorized');
  end if;

  insert into public.games (session_type, period, number, color, big_small)
  values (p_session_type, p_period, p_number, p_color, p_big_small)
  on conflict (period, session_type) do update 
  set number = excluded.number, color = excluded.color, big_small = excluded.big_small;

  return json_build_object('success', true);
end;
$$;

-- Edit user balance directly
create or replace function public.admin_edit_balance(
  p_target_user_id uuid,
  p_new_balance numeric,
  p_reason text
)
returns json
language plpgsql
security definer
as $$
declare
  v_old_balance numeric;
begin
  if not public.is_admin() then
    return json_build_object('error', 'Unauthorized');
  end if;

  select balance into v_old_balance from public.profiles where id = p_target_user_id;

  update public.profiles set balance = p_new_balance where id = p_target_user_id;

  insert into public.transactions (user_id, type, amount, status, details)
  values (
    p_target_user_id, 
    'deposit', -- We log edits as a system deposit/withdrawal
    abs(p_new_balance - v_old_balance), 
    'completed',
    jsonb_build_object('method', 'admin_edit', 'reason', p_reason, 'old_balance', v_old_balance)
  );

  return json_build_object('success', true, 'new_balance', p_new_balance);
end;
$$;

-- Approve/Reject Withdrawal
create or replace function public.admin_process_withdrawal(
  p_transaction_id uuid,
  p_approve boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_tx record;
begin
  if not public.is_admin() then
    return json_build_object('error', 'Unauthorized');
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  
  if not found or v_tx.status != 'pending' then
    return json_build_object('error', 'Transaction not found or already processed');
  end if;

  if p_approve then
    update public.transactions set status = 'completed' where id = p_transaction_id;
  else
    -- Reject: refund the amount
    update public.transactions set status = 'failed' where id = p_transaction_id;
    update public.profiles set balance = balance + v_tx.amount where id = v_tx.user_id;
  end if;

  return json_build_object('success', true);
end;
$$;
