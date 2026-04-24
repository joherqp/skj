-- Migration to add kode_unik to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS kode_unik TEXT;
COMMENT ON COLUMN users.kode_unik IS 'Unique code for sales identification (e.g., IRN, IVN)';
