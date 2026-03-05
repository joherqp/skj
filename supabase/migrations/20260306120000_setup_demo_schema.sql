-- Create demo schema and mirror all public tables structure.
-- Run this migration (or execute in Supabase SQL editor) to make demo mode fully isolated.

create schema if not exists demo;

do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
      and tablename not like 'sql_%'
  loop
    execute format(
      'create table if not exists demo.%I (like public.%I including all);',
      t.tablename,
      t.tablename
    );
  end loop;
end $$;

-- Optional first-time seed from public to demo.
-- Uncomment if you want a snapshot copy of existing data.
-- do $$
-- declare
--   t record;
-- begin
--   for t in
--     select tablename
--     from pg_tables
--     where schemaname = 'public'
--   loop
--     execute format('insert into demo.%I select * from public.%I on conflict do nothing;', t.tablename, t.tablename);
--   end loop;
-- end $$;
