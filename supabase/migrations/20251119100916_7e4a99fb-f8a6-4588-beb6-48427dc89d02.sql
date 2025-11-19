-- Create mechanic_consumables table for tracking consumable inventory
CREATE TABLE IF NOT EXISTS public.mechanic_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'in_stock',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mechanic_consumable_checkouts table for tracking usage
CREATE TABLE IF NOT EXISTS public.mechanic_consumable_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumable_id UUID NOT NULL REFERENCES public.mechanic_consumables(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  job_order_id UUID NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL,
  checked_out_by_user_id UUID,
  checked_out_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mechanic_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_consumable_checkouts ENABLE ROW LEVEL SECURITY;

-- Create policies for mechanic_consumables
CREATE POLICY "All authenticated users can view consumables"
  ON public.mechanic_consumables FOR SELECT
  USING (true);

CREATE POLICY "All authenticated users can insert consumables"
  ON public.mechanic_consumables FOR INSERT
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update consumables"
  ON public.mechanic_consumables FOR UPDATE
  USING (true);

CREATE POLICY "All authenticated users can delete consumables"
  ON public.mechanic_consumables FOR DELETE
  USING (true);

-- Create policies for mechanic_consumable_checkouts
CREATE POLICY "All authenticated users can view consumable checkouts"
  ON public.mechanic_consumable_checkouts FOR SELECT
  USING (true);

CREATE POLICY "All authenticated users can insert consumable checkouts"
  ON public.mechanic_consumable_checkouts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update consumable checkouts"
  ON public.mechanic_consumable_checkouts FOR UPDATE
  USING (true);

CREATE POLICY "All authenticated users can delete consumable checkouts"
  ON public.mechanic_consumable_checkouts FOR DELETE
  USING (true);