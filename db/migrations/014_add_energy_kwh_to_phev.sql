-- Add energy consumption tracking to PHEV entries
-- Migration to add energy_kwh column for Tuya smart plug integration

ALTER TABLE phev_tracker
ADD COLUMN IF NOT EXISTS energy_kwh NUMERIC(10, 3) DEFAULT NULL;

-- Add index for performance on energy queries
CREATE INDEX IF NOT EXISTS idx_phev_tracker_energy_kwh ON phev_tracker(energy_kwh);

-- Add comment for documentation
COMMENT ON COLUMN phev_tracker.energy_kwh IS 'Energy consumed during charging session in kilowatt-hours (kWh), fetched from Tuya smart plug';
