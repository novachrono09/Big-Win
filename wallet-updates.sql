-- 1. Update app_settings
ALTER TABLE public.app_settings 
  ADD COLUMN IF NOT EXISTS loss_bonus_percent numeric DEFAULT 10;

-- 2. Update profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS deposit_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winnings_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_balance numeric DEFAULT 0;

-- 3. Initial Migration
UPDATE public.profiles 
SET 
  deposit_balance = deposited,
  winnings_balance = winnings,
  bonus_balance = joining_bonus,
  balance = deposited + winnings + joining_bonus
WHERE deposit_balance = 0 AND winnings_balance = 0 AND bonus_balance = 0;

-- 4. Re-create update_user_balance
DROP FUNCTION IF EXISTS public.update_user_balance(uuid, numeric, text, jsonb);

CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_profile record;
  v_remaining numeric;
  v_deduct_bonus numeric := 0;
  v_deduct_deposit numeric := 0;
  v_deduct_winnings numeric := 0;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  IF p_amount < 0 THEN
    v_remaining := abs(p_amount);

    IF v_profile.balance < v_remaining THEN
      RETURN jsonb_build_object('error', 'Insufficient balance');
    END IF;

    IF v_profile.bonus_balance >= v_remaining THEN
      v_deduct_bonus := v_remaining;
      v_remaining := 0;
    ELSE
      v_deduct_bonus := v_profile.bonus_balance;
      v_remaining := v_remaining - v_profile.bonus_balance;
    END IF;

    IF v_remaining > 0 THEN
      IF v_profile.deposit_balance >= v_remaining THEN
        v_deduct_deposit := v_remaining;
        v_remaining := 0;
      ELSE
        v_deduct_deposit := v_profile.deposit_balance;
        v_remaining := v_remaining - v_profile.deposit_balance;
      END IF;
    END IF;

    IF v_remaining > 0 THEN
      v_deduct_winnings := v_remaining;
    END IF;

    UPDATE profiles SET
      bonus_balance = bonus_balance - v_deduct_bonus,
      deposit_balance = deposit_balance - v_deduct_deposit,
      winnings_balance = winnings_balance - v_deduct_winnings,
      balance = balance - abs(p_amount),
      deposited = deposited - v_deduct_deposit, 
      winnings = winnings - v_deduct_winnings
    WHERE id = p_user_id;

  ELSE
    UPDATE profiles SET
      winnings_balance = winnings_balance + p_amount,
      balance = balance + p_amount,
      winnings = winnings + p_amount
    WHERE id = p_user_id;
  END IF;

  INSERT INTO transactions (user_id, amount, type, status, metadata)
  VALUES (p_user_id, p_amount, p_reason, 'completed', p_details);

  SELECT balance, deposit_balance, winnings_balance, bonus_balance INTO v_profile FROM profiles WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'balance', v_profile.balance, 'deposit_balance', v_profile.deposit_balance, 'winnings_balance', v_profile.winnings_balance, 'bonus_balance', v_profile.bonus_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-create admin_process_deposit
CREATE OR REPLACE FUNCTION public.admin_process_deposit(
  p_transaction_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
BEGIN
  SELECT user_id, amount INTO v_user_id, v_amount 
  FROM transactions WHERE id = p_transaction_id;

  IF p_approve THEN
    UPDATE transactions SET status = 'completed' WHERE id = p_transaction_id;
    UPDATE profiles SET 
      deposit_balance = deposit_balance + v_amount, 
      balance = balance + v_amount,
      deposited = deposited + v_amount
    WHERE id = v_user_id;
  ELSE
    UPDATE transactions SET status = 'rejected', metadata = jsonb_build_object('reason', p_reason) WHERE id = p_transaction_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-create unlock_joining_bonus
DROP FUNCTION IF EXISTS public.unlock_joining_bonus(uuid);
CREATE OR REPLACE FUNCTION public.unlock_joining_bonus(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_bonus numeric;
  v_unique_utr text;
BEGIN
  SELECT joining_bonus INTO v_bonus FROM profiles WHERE id = p_user_id;
  v_unique_utr := 'BONUS-' || upper(substr(md5(p_user_id::text || now()::text), 1, 10));

  IF v_bonus > 0 THEN
    UPDATE profiles 
    SET 
      bonus_balance = bonus_balance + v_bonus,
      balance = balance + v_bonus,
      joining_bonus = 0,
      bonus_locked = false,
      has_deposited = true
    WHERE id = p_user_id;
    
    INSERT INTO transactions (user_id, amount, type, status, utr)
    VALUES (p_user_id, v_bonus, 'bonus', 'completed', v_unique_utr);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Re-create admin_process_withdrawal
DROP FUNCTION IF EXISTS public.admin_process_withdrawal(uuid, boolean);
DROP FUNCTION IF EXISTS public.admin_process_withdrawal(uuid, boolean, text);
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_transaction_id uuid,
  p_approve boolean
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
BEGIN
  SELECT user_id, amount INTO v_user_id, v_amount 
  FROM transactions WHERE id = p_transaction_id;

  IF p_approve THEN
    UPDATE transactions SET status = 'completed' WHERE id = p_transaction_id;
  ELSE
    UPDATE transactions SET status = 'rejected' WHERE id = p_transaction_id;
    UPDATE profiles SET 
      winnings_balance = winnings_balance + abs(v_amount), 
      balance = balance + abs(v_amount),
      winnings = winnings + abs(v_amount)
    WHERE id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add Loss Bonus Function
CREATE OR REPLACE FUNCTION public.process_round_loss_bonus(
  p_user_id uuid,
  p_net_loss numeric,
  p_period text
) RETURNS numeric AS $$
DECLARE
  v_percent numeric;
  v_bonus_amount numeric;
  v_unique_utr text;
BEGIN
  IF p_net_loss <= 0 THEN RETURN 0; END IF;

  SELECT loss_bonus_percent INTO v_percent FROM app_settings WHERE id = 1;
  IF v_percent IS NULL OR v_percent <= 0 THEN RETURN 0; END IF;

  v_bonus_amount := round(p_net_loss * (v_percent / 100.0), 2);
  IF v_bonus_amount <= 0 THEN RETURN 0; END IF;

  v_unique_utr := 'LOSS-BONUS-' || upper(substr(md5(p_user_id::text || p_period || now()::text), 1, 10));

  UPDATE profiles SET 
    bonus_balance = bonus_balance + v_bonus_amount,
    balance = balance + v_bonus_amount
  WHERE id = p_user_id;

  INSERT INTO transactions (user_id, amount, type, status, utr, metadata)
  VALUES (p_user_id, v_bonus_amount, 'bonus', 'completed', v_unique_utr, jsonb_build_object('period', p_period, 'net_loss', p_net_loss, 'bonus_type', 'loss_bonus'));

  RETURN v_bonus_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update process_loss_referral_bonus
CREATE OR REPLACE FUNCTION public.process_loss_referral_bonus(
  p_user_id uuid,
  p_loss_amount numeric
) RETURNS void AS $$
DECLARE
  v_referrer_id uuid;
  v_percent numeric;
  v_bonus numeric;
BEGIN
  SELECT referrer_id INTO v_referrer_id FROM profiles WHERE id = p_user_id;
  IF v_referrer_id IS NULL THEN RETURN; END IF;

  SELECT referral_bet_loss_bonus_percent INTO v_percent FROM app_settings WHERE id = 1;
  IF v_percent IS NULL OR v_percent <= 0 THEN RETURN; END IF;

  v_bonus := round(p_loss_amount * (v_percent / 100.0), 2);
  IF v_bonus <= 0 THEN RETURN; END IF;

  UPDATE profiles SET 
    bonus_balance = bonus_balance + v_bonus,
    balance = balance + v_bonus
  WHERE id = v_referrer_id;

  INSERT INTO referral_earnings (referrer_id, referred_id, amount, from_type)
  VALUES (v_referrer_id, p_user_id, v_bonus, 'bet_loss');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
