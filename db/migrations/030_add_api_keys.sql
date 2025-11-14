-- ============================================
-- API Keys and Rate Limiting
-- Migration: Add API authentication system
-- Date: 2025-11-13
-- ============================================

-- API Keys table for authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,

  -- Key details
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- User-friendly name for the key
  description TEXT,                      -- Optional description

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  request_count BIGINT DEFAULT 0,

  -- Scopes/Permissions (JSONB for flexibility)
  scopes JSONB DEFAULT '["read", "write"]'::jsonb,
  -- Example: ["read", "write", "admin"]
  -- Or more granular: ["highlights:read", "highlights:write", "sources:read"]

  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 100,
  rate_limit_per_day INTEGER DEFAULT 1000,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (length(key) >= 32),
  CHECK (rate_limit_per_hour > 0),
  CHECK (rate_limit_per_day > 0)
);

-- API Request Log for rate limiting and analytics
CREATE TABLE IF NOT EXISTS api_request_log (
  id BIGSERIAL PRIMARY KEY,

  -- API Key reference
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER,

  -- Client information
  ip_address INET,
  user_agent TEXT,

  -- Timing
  response_time_ms INTEGER,

  -- Request metadata
  query_params JSONB DEFAULT '{}'::jsonb,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,

  -- Error tracking
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (status_code >= 100 AND status_code < 600),
  CHECK (response_time_ms >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Request log indexes (for rate limiting queries)
CREATE INDEX IF NOT EXISTS idx_api_request_log_api_key_id ON api_request_log(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_created_at ON api_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_endpoint ON api_request_log(endpoint);

-- Partial index for recent requests (used for rate limiting - last 24 hours)
CREATE INDEX IF NOT EXISTS idx_api_request_log_recent
  ON api_request_log(api_key_id, created_at)
  WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================
-- TRIGGERS
-- ============================================

-- Update api_keys.updated_at on change
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_api_keys_updated_at ON api_keys;
CREATE TRIGGER trigger_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- Auto-cleanup old request logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_request_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_request_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Check rate limit for API key
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id INTEGER,
  p_limit_per_hour INTEGER,
  p_limit_per_day INTEGER
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  requests_last_hour BIGINT,
  requests_last_day BIGINT,
  reset_hour_at TIMESTAMPTZ,
  reset_day_at TIMESTAMPTZ
) AS $$
DECLARE
  v_requests_last_hour BIGINT;
  v_requests_last_day BIGINT;
BEGIN
  -- Count requests in last hour
  SELECT COUNT(*) INTO v_requests_last_hour
  FROM api_request_log
  WHERE api_key_id = p_api_key_id
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Count requests in last day
  SELECT COUNT(*) INTO v_requests_last_day
  FROM api_request_log
  WHERE api_key_id = p_api_key_id
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Return results
  RETURN QUERY
  SELECT
    (v_requests_last_hour < p_limit_per_hour AND v_requests_last_day < p_limit_per_day) as is_allowed,
    v_requests_last_hour,
    v_requests_last_day,
    date_trunc('hour', NOW()) + INTERVAL '1 hour' as reset_hour_at,
    date_trunc('day', NOW()) + INTERVAL '1 day' as reset_day_at;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate random API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Generate a random 48-character key (base64-like)
  v_key := 'ft_' || encode(gen_random_bytes(32), 'base64');
  v_key := replace(v_key, '/', '_');
  v_key := replace(v_key, '+', '-');
  v_key := replace(v_key, '=', '');
  RETURN substring(v_key, 1, 48);
END;
$$ LANGUAGE plpgsql;

-- Function: Validate API key and return details
CREATE OR REPLACE FUNCTION validate_api_key(p_key TEXT)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  scopes JSONB,
  rate_limit_per_hour INTEGER,
  rate_limit_per_day INTEGER,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id,
    ak.name,
    ak.scopes,
    ak.rate_limit_per_hour,
    ak.rate_limit_per_day,
    (ak.is_active AND (ak.expires_at IS NULL OR ak.expires_at > NOW())) as is_valid
  FROM api_keys ak
  WHERE ak.key = p_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE api_keys IS 'API authentication keys with rate limiting and scopes';
COMMENT ON TABLE api_request_log IS 'API request logs for analytics and rate limiting';

COMMENT ON COLUMN api_keys.key IS 'Unique API key string (min 32 characters)';
COMMENT ON COLUMN api_keys.scopes IS 'Permissions array for granular access control';
COMMENT ON COLUMN api_keys.rate_limit_per_hour IS 'Maximum requests per hour';
COMMENT ON COLUMN api_keys.rate_limit_per_day IS 'Maximum requests per day';

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Create a default API key for testing (REMOVE IN PRODUCTION)
-- INSERT INTO api_keys (key, name, description, scopes, rate_limit_per_hour, rate_limit_per_day)
-- VALUES (
--   generate_api_key(),
--   'Development Key',
--   'Default API key for development and testing',
--   '["read", "write"]'::jsonb,
--   1000,
--   10000
-- );

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE api_keys;
ANALYZE api_request_log;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
