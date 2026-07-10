-- Migration: Create ai_usage_logs table for token and cost tracking
-- Description: Phase 4 AI scaffolding for rate limiting and logging

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 6) DEFAULT 0,
    intents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view and insert logs for their business
CREATE POLICY "Users can view usage logs for their business"
    ON public.ai_usage_logs FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert usage logs for their business"
    ON public.ai_usage_logs FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_users WHERE profile_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_business_id ON public.ai_usage_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
