import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Use service role to bypass RLS and perform secure operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, amount, reason, payment_details = {} } = await req.json();

    if (!user_id || amount === undefined || !reason) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const currentBalance = Number(profile.balance);
    const numAmount = Number(amount);

    // 2. Validate transaction
    if (['bet', 'withdrawal', 'loss'].includes(reason) && currentBalance < Math.abs(numAmount)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Calculate new balance
    // amount should be positive for deposit/win, negative for bet/withdrawal
    const newBalance = currentBalance + numAmount;

    // Prevent negative balances explicitly just in case
    if (newBalance < 0) {
      return new Response(
        JSON.stringify({ error: 'Transaction would result in a negative balance' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Update Balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user_id);

    if (updateError) throw updateError;

    // 4. Record Transaction
    let status = 'completed';
    if (reason === 'withdrawal') status = 'pending'; // Withdrawals might need manual review

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        user_id,
        type: reason,
        amount: Math.abs(numAmount), // Store positive amount, type defines direction
        status,
        details: payment_details
      }]);

    if (txError) {
      console.error('Failed to log transaction:', txError);
      // We don't rollback the balance update here for simplicity, but in a real bank we would
    }

    return new Response(
      JSON.stringify({ success: true, balance: newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
