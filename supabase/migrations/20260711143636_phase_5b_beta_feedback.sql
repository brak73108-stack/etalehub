-- Migration: Add beta_feedback table

CREATE TABLE public.beta_feedback (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID,
    feedback_type TEXT NOT NULL,
    page_or_workflow TEXT,
    description TEXT NOT NULL,
    urgency TEXT,
    contact_email TEXT,
    mode TEXT DEFAULT 'production',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for tenant isolation
CREATE POLICY "Users can view their own business feedback" ON public.beta_feedback
    FOR SELECT
    USING (business_id = (SELECT business_id FROM public.business_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can insert feedback for their business" ON public.beta_feedback
    FOR INSERT
    WITH CHECK (business_id = (SELECT business_id FROM public.business_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can update their business feedback" ON public.beta_feedback
    FOR UPDATE
    USING (business_id = (SELECT business_id FROM public.business_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can delete their business feedback" ON public.beta_feedback
    FOR DELETE
    USING (business_id = (SELECT business_id FROM public.business_users WHERE user_id = auth.uid() LIMIT 1));

-- Indexes
CREATE INDEX idx_beta_feedback_business_id ON public.beta_feedback(business_id);
CREATE INDEX idx_beta_feedback_type ON public.beta_feedback(feedback_type);
CREATE INDEX idx_beta_feedback_status ON public.beta_feedback(status);
