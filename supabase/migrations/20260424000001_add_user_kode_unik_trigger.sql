-- Migration: Add trigger for automatic kode_unik generation
-- Includes the generate_sales_code function for completeness

-- 1. FIX FOR PUBLIC SCHEMA
-- ---------------------------------

-- Function to generate unique 3-letter codes for PUBLIC
CREATE OR REPLACE FUNCTION public.generate_sales_code(input_name TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned_name TEXT;
    candidate_code TEXT;
    i INTEGER;
    name_len INTEGER;
BEGIN
    -- Clean the name: uppercase, remove non-alphabetic chars
    cleaned_name := UPPER(REGEXP_REPLACE(input_name, '[^A-Z]', '', 'g'));
    name_len := LENGTH(cleaned_name);
    
    -- Fallback for very short names
    IF name_len < 3 THEN
        RETURN RPAD(cleaned_name, 3, 'X');
    END IF;

    -- Try generating a unique code based on letters
    -- Priority: First + (Second, then Third, etc.) + Last
    FOR i IN 2..(name_len - 1) LOOP
        candidate_code := SUBSTRING(cleaned_name FROM 1 FOR 1) || 
                         SUBSTRING(cleaned_name FROM i FOR 1) || 
                         SUBSTRING(cleaned_name FROM name_len FOR 1);
        
        -- Check for uniqueness in public.users
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE kode_unik = candidate_code) THEN
            RETURN candidate_code;
        END IF;
    END LOOP;

    -- Fallback if no unique code found in loop
    RETURN candidate_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for PUBLIC
CREATE OR REPLACE FUNCTION public.handle_user_kode_unik_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if 'admin' or 'administrator' role is present and kode_unik is missing
    IF ('admin' = ANY(NEW.roles) OR 'administrator' = ANY(NEW.roles)) 
       AND (NEW.kode_unik IS NULL OR NEW.kode_unik = '') THEN
        NEW.kode_unik := public.generate_sales_code(NEW.nama);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for PUBLIC
DROP TRIGGER IF EXISTS tr_user_generate_kode_unik ON public.users;
CREATE TRIGGER tr_user_generate_kode_unik
BEFORE INSERT OR UPDATE OF roles, nama ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_kode_unik_assignment();

-- Update existing users in PUBLIC
UPDATE public.users 
SET kode_unik = public.generate_sales_code(nama)
WHERE ('admin' = ANY(roles) OR 'administrator' = ANY(roles)) 
AND (kode_unik IS NULL OR kode_unik = '');


-- 2. FIX FOR DEMO SCHEMA
-- ---------------------------------

-- Function to generate unique 3-letter codes for DEMO
CREATE OR REPLACE FUNCTION demo.generate_sales_code(input_name TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned_name TEXT;
    candidate_code TEXT;
    i INTEGER;
    name_len INTEGER;
BEGIN
    cleaned_name := UPPER(REGEXP_REPLACE(input_name, '[^A-Z]', '', 'g'));
    name_len := LENGTH(cleaned_name);
    
    IF name_len < 3 THEN
        RETURN RPAD(cleaned_name, 3, 'X');
    END IF;

    FOR i IN 2..(name_len - 1) LOOP
        candidate_code := SUBSTRING(cleaned_name FROM 1 FOR 1) || 
                         SUBSTRING(cleaned_name FROM i FOR 1) || 
                         SUBSTRING(cleaned_name FROM name_len FOR 1);
        
        IF NOT EXISTS (SELECT 1 FROM demo.users WHERE kode_unik = candidate_code) THEN
            RETURN candidate_code;
        END IF;
    END LOOP;

    RETURN candidate_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for DEMO
CREATE OR REPLACE FUNCTION demo.handle_user_kode_unik_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF ('admin' = ANY(NEW.roles) OR 'administrator' = ANY(NEW.roles)) 
       AND (NEW.kode_unik IS NULL OR NEW.kode_unik = '') THEN
        NEW.kode_unik := demo.generate_sales_code(NEW.nama);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for DEMO
DROP TRIGGER IF EXISTS tr_user_generate_kode_unik ON demo.users;
CREATE TRIGGER tr_user_generate_kode_unik
BEFORE INSERT OR UPDATE OF roles, nama ON demo.users
FOR EACH ROW
EXECUTE FUNCTION demo.handle_user_kode_unik_assignment();

-- Update existing users in DEMO
UPDATE demo.users 
SET kode_unik = demo.generate_sales_code(nama)
WHERE ('admin' = ANY(roles) OR 'administrator' = ANY(roles)) 
AND (kode_unik IS NULL OR kode_unik = '');
