-- 1. Update Transactions Table
alter table public.transactions 
  add column if not exists utr text unique,
  add column if not exists screenshot_url text;

-- 2. Update App Settings Table
alter table public.app_settings
  add column if not exists upi_id text default 'yourupi@oksbi',
  add column if not exists qr_code_url text default '';

-- 3. Create RPC for User Submitting Deposit Request
create or replace function public.submit_deposit_request(
  p_user_id uuid,
  p_amount numeric,
  p_utr text,
  p_screenshot_url text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_existing_utr uuid;
begin
  -- Basic validation
  if p_amount < 100 then
    return json_build_object('error', 'Minimum deposit is ₹100');
  end if;

  if length(p_utr) < 12 then
    return json_build_object('error', 'Invalid UTR format. Must be at least 12 digits.');
  end if;

  -- Check for duplicate UTR
  select id into v_existing_utr from public.transactions where utr = p_utr;
  if found then
    return json_build_object('error', 'This UTR has already been submitted.');
  end if;

  -- Insert pending deposit transaction
  insert into public.transactions (user_id, type, amount, status, utr, screenshot_url, details)
  values (
    p_user_id, 
    'deposit', 
    p_amount, 
    'pending', 
    p_utr, 
    p_screenshot_url,
    jsonb_build_object('method', 'UPI', 'simulated', false)
  );

  return json_build_object('success', true);
end;
$$;

-- 4. Create RPC for Admin Approving/Rejecting Deposit
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
begin
  if not public.is_admin() then
    return json_build_object('error', 'Unauthorized');
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  
  if not found or v_tx.status != 'pending' or v_tx.type != 'deposit' then
    return json_build_object('error', 'Transaction not found or already processed');
  end if;

  if p_approve then
    update public.transactions set status = 'completed' where id = p_transaction_id;
    -- Add balance to user
    update public.profiles set balance = balance + v_tx.amount where id = v_tx.user_id;
  else
    -- Reject
    update public.transactions 
    set status = 'failed', details = jsonb_set(details, '{rejection_reason}', to_jsonb(p_reason)) 
    where id = p_transaction_id;
  end if;

  return json_build_object('success', true);
end;
$$;
