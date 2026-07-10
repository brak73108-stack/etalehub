-- 1. PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. BUSINESSES
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text default 'plumbing_heating',
  owner_id uuid references auth.users(id),
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. BUSINESS USERS (Membership)
create table public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'owner',
  status text not null default 'active',
  created_at timestamptz default now(),
  unique(business_id, profile_id)
);

-- Helper function for RLS
create or replace function public.user_is_business_member(business_uuid uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.business_users
    where business_id = business_uuid
    and profile_id = auth.uid()
    and status = 'active'
  );
end;
$$ language plpgsql security definer;

-- 4. CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  property_notes text,
  equipment_list jsonb default '[]',
  preferred_contact text,
  communication_style text,
  customer_status text default 'active',
  notes text,
  last_service_date date,
  next_service_due date,
  lifetime_value numeric default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. JOBS
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  description text,
  status text default 'booked',
  scheduled_date timestamptz,
  completed_date timestamptz,
  job_type text,
  notes jsonb default '[]',
  photos jsonb default '[]',
  final_price numeric,
  payment_status text default 'unpaid',
  follow_up_required boolean default false,
  service_history_note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. INVOICES
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_number text,
  line_items jsonb default '[]',
  subtotal numeric default 0,
  tax_rate numeric default 0,
  tax_amount numeric default 0,
  total numeric default 0,
  status text default 'draft',
  payment_method text,
  paid_date timestamptz,
  due_date timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. QUOTES
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  quote_number text,
  line_items jsonb default '[]',
  total numeric default 0,
  status text default 'draft',
  follow_up_date timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. REMINDERS
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  reminder_type text,
  type text,
  message text,
  scheduled_date timestamptz,
  recurrence text,
  status text default 'pending',
  created_by_ai boolean default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. APPROVALS
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  action_type text,
  entity_type text,
  entity_id uuid,
  proposed_action jsonb,
  risk_level text,
  status text default 'pending',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. AI ACTIONS
create table public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  input_text text,
  interpreted_intent jsonb,
  extracted_entities jsonb,
  proposed_actions jsonb,
  executed_actions jsonb,
  confidence_score numeric,
  risk_level text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 11. AUDIT LOGS
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  before_value jsonb,
  after_value jsonb,
  source text,
  risk_level text,
  approval_status text,
  created_by uuid references auth.users(id),
  timestamp timestamptz default now()
);

-- 12. BUSINESS SETTINGS
create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade unique,
  ai_behaviour jsonb default '{}',
  approval_rules jsonb default '{}',
  message_tone text default 'professional',
  payment_terms text,
  working_hours jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_users enable row level security;
alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.invoices enable row level security;
alter table public.quotes enable row level security;
alter table public.reminders enable row level security;
alter table public.approvals enable row level security;
alter table public.ai_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.business_settings enable row level security;

-- Profiles: Users can see and update their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Businesses: Users can see businesses they are members of
create policy "Users can view their businesses" on public.businesses for select using (public.user_is_business_member(id));
-- Allow a user to create a business and become owner
create policy "Users can create businesses" on public.businesses for insert with check (auth.uid() = owner_id);
-- Allow owner/admin to update business
create policy "Owners can update business" on public.businesses for update using (
  exists (select 1 from public.business_users where business_id = id and profile_id = auth.uid() and role in ('owner', 'admin') and status = 'active')
);

-- Business Users: Users can see memberships for their businesses
create policy "Users can view memberships for their business" on public.business_users for select using (public.user_is_business_member(business_id));
-- Allow system to insert via RPC/trigger or allow owners to invite
create policy "Users can insert membership if they are owner" on public.business_users for insert with check (
  auth.uid() = profile_id OR exists (select 1 from public.business_users where business_id = public.business_users.business_id and profile_id = auth.uid() and role = 'owner')
);

-- All other business entity tables: Basic "Member can CRUD" policy for Phase 3
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['customers', 'jobs', 'invoices', 'quotes', 'reminders', 'approvals', 'ai_actions', 'audit_logs', 'business_settings'])
  LOOP
    EXECUTE format('create policy "Members can view %I" on public.%I for select using (public.user_is_business_member(business_id));', table_name, table_name);
    EXECUTE format('create policy "Members can insert %I" on public.%I for insert with check (public.user_is_business_member(business_id));', table_name, table_name);
    EXECUTE format('create policy "Members can update %I" on public.%I for update using (public.user_is_business_member(business_id));', table_name, table_name);
    EXECUTE format('create policy "Members can delete %I" on public.%I for delete using (public.user_is_business_member(business_id));', table_name, table_name);
  END LOOP;
END;
$$;
