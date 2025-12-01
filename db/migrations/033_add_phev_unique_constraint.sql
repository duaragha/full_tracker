-- Add unique constraint to prevent duplicate PHEV entries for same date and car
-- This ensures only one entry per car per day

-- First, check if there are any remaining duplicates (there shouldn't be after cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM phev_tracker
    GROUP BY date, car_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique constraint: duplicate entries still exist for same date and car_id';
  END IF;
END $$;

-- Add unique constraint on date + car_id
-- This allows multiple entries on the same date for DIFFERENT cars, but not for the same car
ALTER TABLE phev_tracker
ADD CONSTRAINT phev_tracker_date_car_unique
UNIQUE (date, car_id);

-- Also add a check in the addEntry function comment for documentation
COMMENT ON CONSTRAINT phev_tracker_date_car_unique ON phev_tracker IS
'Prevents duplicate entries for the same car on the same date. Added after duplicate import incident.';
