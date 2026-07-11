-- Add new JSONB columns for Phase 5B Beta Onboarding and Business Configuration
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS business_profile JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_types JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS invoice_defaults JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quote_defaults JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reminder_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT '{}';
