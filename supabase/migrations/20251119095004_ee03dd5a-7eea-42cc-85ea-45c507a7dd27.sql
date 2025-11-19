-- Update tool_checkouts to include job order, checkout/checkin users, and photo
ALTER TABLE public.tool_checkouts
ADD COLUMN job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
ADD COLUMN checked_out_by_user_id UUID,
ADD COLUMN checked_in_by_user_id UUID,
ADD COLUMN checkin_photo_url TEXT;

-- Create equipment_inventory table
CREATE TABLE public.equipment_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_consumable BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_checkouts table
CREATE TABLE public.equipment_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment_inventory(id) ON DELETE CASCADE,
  assigned_to_type TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  helper_id UUID REFERENCES public.helpers(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  checked_out_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'checked_out',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment_inventory
CREATE POLICY "All authenticated users can view equipment" ON public.equipment_inventory FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert equipment" ON public.equipment_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update equipment" ON public.equipment_inventory FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete equipment" ON public.equipment_inventory FOR DELETE USING (true);

-- RLS Policies for equipment_checkouts
CREATE POLICY "All authenticated users can view equipment checkouts" ON public.equipment_checkouts FOR SELECT USING (true);
CREATE POLICY "All authenticated users can insert equipment checkouts" ON public.equipment_checkouts FOR INSERT WITH CHECK (true);
CREATE POLICY "All authenticated users can update equipment checkouts" ON public.equipment_checkouts FOR UPDATE USING (true);
CREATE POLICY "All authenticated users can delete equipment checkouts" ON public.equipment_checkouts FOR DELETE USING (true);