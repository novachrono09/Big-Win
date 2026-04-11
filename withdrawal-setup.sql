-- 1. Withdrawal Methods Table
create table if not exists public.withdrawal_methods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('upi', 'bank', 'qr')) not null,
  details jsonb not null,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.withdrawal_methods enable row level security;

drop policy if exists "Users can manage own methods" on public.withdrawal_methods;
create policy "Users can manage own methods" on public.withdrawal_methods 
  for all using (auth.uid() = user_id);

-- 2. Update transactions table
alter table public.transactions 
  add column if not exists withdrawal_method_id uuid references public.withdrawal_methods(id),
  add column if not exists withdrawal_details jsonb;

-- 3. Add daily withdrawal limit to settings
alter table public.app_settings
  add column if not exists daily_withdrawal_limit numeric default 50000;

-- 4. Secure RPC: Request Withdrawal
create or replace function public.request_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_method_id uuid,
  p_method_details jsonb
)
returns json
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_tx_id uuid;
begin
  -- 1. Check balance
  select balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_amount then
    return json_build_object('error', 'Insufficient balance');
  end if;

  -- 2. Deduct balance immediately
  update public.profiles set balance = balance - p_amount where id = p_user_id;

  -- 3. Create pending transaction
  insert into public.transactions (user_id, type, amount, status, withdrawal_method_id, withdrawal_details, details)
  values (p_user_id, 'withdrawal', p_amount, 'pending', p_method_id, p_method_details, '{"description": "User requested withdrawal"}')
  returning id into v_tx_id;

  return json_build_object('success', true, 'transaction_id', v_tx_id);
end;
$$;

-- 5. Secure RPC: Admin Process Withdrawal (Approve/Reject)
create or replace function public.admin_process_withdrawal(
  p_transaction_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_tx record;
begin
  -- Security check
  if not public.is_admin() then return json_build_object('error', 'Unauthorized'); end if;

  -- Lock transaction
  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found or v_tx.status != 'pending' or v_tx.type != 'withdrawal' then
    return json_build_object('error', 'Transaction not found or already processed');
  end if;

  if p_approve then
    -- Mark as completed
    update public.transactions set status = 'completed' where id = p_transaction_id;
    
    -- Notify user
    insert into public.user_notifications (user_id, title, message, type)
    values (v_tx.user_id, 'Withdrawal Approved', 'Your withdrawal of ₹' || v_tx.amount || ' has been processed successfully.', 'success');
  else
    -- Reject: Mark as failed and refund the balance
    update public.transactions set status = 'failed', details = jsonb_set(coalesce(details, '{}'::jsonb), '{rejection_reason}', to_jsonb(p_reason)) where id = p_transaction_id;
    update public.profiles set balance = balance + v_tx.amount where id = v_tx.user_id;
    
    -- Notify user
    insert into public.user_notifications (user_id, title, message, type)
    values (v_tx.user_id, 'Withdrawal Rejected', 'Your withdrawal of ₹' || v_tx.amount || ' was rejected and refunded. Reason: ' || coalesce(p_reason, 'None'), 'error');
  end if;

  return json_build_object('success', true);
end;
$$;

-- Ensure Admins can read the withdrawal methods if needed
drop policy if exists "Admin read withdrawal_methods" on public.withdrawal_methods;
create policy "Admin read withdrawal_methods" on public.withdrawal_methods for select using ( (select is_admin from profiles where id = auth.uid()) = true );
