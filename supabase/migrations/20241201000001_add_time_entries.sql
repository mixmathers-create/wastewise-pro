-- Create time_entries table for HR time tracking
CREATE TABLE time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own time entries" ON time_entries
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "HR and admins can view all time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('hr', 'admin')
    )
  );

CREATE POLICY "Users can insert their own time entries" ON time_entries
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "HR and admins can update time entries" ON time_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type IN ('hr', 'admin')
    )
  );

-- Create index for performance
CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, date);
CREATE INDEX idx_time_entries_status ON time_entries(status);