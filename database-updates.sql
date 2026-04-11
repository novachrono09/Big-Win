-- 1. Create Transactions Table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('deposit', 'withdrawal', 'win', 'loss', 'bet')),
  amount numeric not null,
  status text default 'completed' check (status in ('pending', 'completed', 'failed')),
  details jsonb,
  created_at timestamp with time zone default now()
);

-- 2. Enable RLS
alter table public.transactions enable row level security;

-- 3. Create RLS Policies
-- Users can only view their own transactions
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);

-- Only the system (service_role via Edge Function) should be able to insert/update transactions.
-- If you want users to insert pending withdrawals directly, you can uncomment this:
-- create policy "Users can insert transactions" on transactions for insert with check (auth.uid() = user_id);

-- 4. Set up Realtime for Profiles (Required for the instant balance updates)
-- Go to your Supabase Dashboard -> Database -> Replication
-- Enable replication for the "profiles" table.
-- Alternatively, run this SQL:
alter publication supabase_realtime add table profiles;
