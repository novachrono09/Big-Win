-- 1. Notifications Table
create table if not exists public.user_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  message text not null,
  type text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.user_notifications;
create policy "Users can view own notifications" on public.user_notifications for select using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.user_notifications;
create policy "System can insert notifications" on public.user_notifications for insert with check (true);

drop policy if exists "Users can update own notifications" on public.user_notifications;
create policy "Users can update own notifications" on public.user_notifications for update using (auth.uid() = user_id);

-- 2. Add Responsible Gambling & Settings columns to profiles
alter table public.profiles 
  add column if not exists daily_bet_limit numeric default 100000,
  add column if not exists session_time_limit integer default 120,
  add column if not exists self_excluded_until timestamp with time zone,
  add column if not exists avatar_url text;

-- 3. Trigger notification on Deposit Approval (Updating previous RPC)
create or replace function public.admin_process_deposit(
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
  v_referrer_id uuid;
  v_bonus_percent numeric;
  v_bonus_amount numeric;
begin
  if not public.is_admin() then return json_build_object('error', 'Unauthorized'); end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found or v_tx.status != 'pending' or v_tx.type != 'deposit' then
    return json_build_object('error', 'Transaction not found or already processed');
  end if;

  if p_approve then
    update public.transactions set status = 'completed' where id = p_transaction_id;
    update public.profiles set balance = balance + v_tx.amount where id = v_tx.user_id;
    
    -- Notify user
    insert into public.user_notifications (user_id, title, message, type)
    values (v_tx.user_id, 'Deposit Approved', 'Your deposit of ₹' || v_tx.amount || ' has been approved.', 'success');

    -- Referral Logic
    select referred_by into v_referrer_id from public.profiles where id = v_tx.user_id;
    if v_referrer_id is not null then
       select coalesce(referral_deposit_bonus_percent, 10.0) into v_bonus_percent from public.app_settings where id = 1;
       v_bonus_amount := (v_tx.amount * v_bonus_percent) / 100;
       if v_bonus_amount > 0 then
         update public.profiles set balance = balance + v_bonus_amount, total_referral_earnings = total_referral_earnings + v_bonus_amount where id = v_referrer_id;
         insert into public.referral_earnings (referrer_id, referred_user_id, from_type, amount, transaction_id) values (v_referrer_id, v_tx.user_id, 'deposit', v_bonus_amount, p_transaction_id);
         -- Notify Referrer
         insert into public.user_notifications (user_id, title, message, type)
         values (v_referrer_id, 'Referral Bonus!', 'You received ₹' || v_bonus_amount || ' from a subordinate deposit.', 'bonus');
       end if;
    end if;
  else
    update public.transactions set status = 'failed', details = jsonb_set(details, '{rejection_reason}', to_jsonb(p_reason)) where id = p_transaction_id;
    insert into public.user_notifications (user_id, title, message, type)
    values (v_tx.user_id, 'Deposit Rejected', 'Your deposit was rejected. Reason: ' || coalesce(p_reason, 'None'), 'error');
  end if;

  return json_build_object('success', true);
end;
$$;
