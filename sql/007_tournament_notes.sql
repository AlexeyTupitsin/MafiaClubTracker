-- Add notes field to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS notes TEXT;
