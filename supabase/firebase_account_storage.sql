-- Link symptom rows to the signed-in Firebase account.
-- Run once in Supabase SQL Editor after adding Firebase under
-- Authentication -> Third-Party Auth.

alter table public.symptoms
  add column if not exists patient_input_en text;

alter table public.symptoms
  drop constraint if exists symptoms_user_id_fkey;

drop policy if exists "symptoms_select_own" on public.symptoms;
drop policy if exists "symptoms_insert_own" on public.symptoms;
drop policy if exists "symptoms_update_own" on public.symptoms;
drop policy if exists "symptoms_delete_own" on public.symptoms;

alter table public.symptoms
  alter column user_id drop default;

alter table public.symptoms
  alter column user_id type text using user_id::text;

create policy "symptoms_select_own" on public.symptoms
  for select to anon, authenticated using (
    user_id = auth.jwt()->>'sub'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/' || (auth.jwt()->>'aud')
  );

create policy "symptoms_insert_own" on public.symptoms
  for insert to anon, authenticated with check (
    user_id = auth.jwt()->>'sub'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/' || (auth.jwt()->>'aud')
  );

create policy "symptoms_update_own" on public.symptoms
  for update to anon, authenticated
  using (
    user_id = auth.jwt()->>'sub'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/' || (auth.jwt()->>'aud')
  )
  with check (
    user_id = auth.jwt()->>'sub'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/' || (auth.jwt()->>'aud')
  );

create policy "symptoms_delete_own" on public.symptoms
  for delete to anon, authenticated using (
    user_id = auth.jwt()->>'sub'
    and auth.jwt()->>'iss' = 'https://securetoken.google.com/' || (auth.jwt()->>'aud')
  );

grant select, insert, update, delete on public.symptoms to anon, authenticated;