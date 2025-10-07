-- PHEV Tracker Database Schema
-- Migration for Railway PostgreSQL

-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create phev_tracker table
CREATE TABLE IF NOT EXISTS phev_tracker (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  cost NUMERIC(10, 2) NOT NULL,
  km_driven NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  car_id INTEGER REFERENCES cars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phev_tracker_car_id ON phev_tracker(car_id);
CREATE INDEX IF NOT EXISTS idx_phev_tracker_date ON phev_tracker(date DESC);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at);

-- Add comments for documentation
COMMENT ON TABLE cars IS 'Stores PHEV/EV vehicles being tracked';
COMMENT ON COLUMN cars.start_date IS 'Date the vehicle began tracking in the app';
COMMENT ON COLUMN cars.end_date IS 'Date the vehicle was replaced or retired';

COMMENT ON TABLE phev_tracker IS 'Stores individual EV charging sessions and driving logs';
COMMENT ON COLUMN phev_tracker.cost IS 'Cost of charging session in dollars';
COMMENT ON COLUMN phev_tracker.km_driven IS 'Kilometers driven on electric power';
COMMENT ON COLUMN phev_tracker.car_id IS 'Reference to the car (NULL for unassigned entries)';
