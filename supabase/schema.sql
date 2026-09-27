-- Wavelength: symptoms table
-- Run this once in the Supabase dashboard (SQL Editor -> New query -> Run).
--
-- One row = one intake entry: what the patient said (typed or spoken) plus the
-- /api/translate response for it. Column names match the API contract
-- (snake_case) so rows can be built straight from the response.
--
-- Auth: Firebase ID tokens are configured as a Supabase third-party provider.
-- RLS restricts every row to the Firebase UID in the verified token.

create table if not exists public.symptoms (
  -- Generated client-side so an entry saved to localStorage while offline keeps
  -- the same id when it's synced up later (upsert on id = no duplicates).
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  created_at         timestamptz not null default now(),

  -- Intake
  patient_input      text not null check (length(trim(patient_input)) > 0),
  input_method       text not null default 'text' check (input_method in ('text', 'voice')),
  patient_input_en  text,

  -- /api/translate response (nullable: an entry can be saved before/without translation)
  clinical_phrasing  text,
  why_it_matters     text,
  follow_up_question text,
  emergency          boolean not null default false
);

create index if not exists symptoms_user_created_idx
  on public.symptoms (user_id, created_at desc);

alter table public.symptoms enable row level security;

drop policy if exists "symptoms_select_own" on public.symptoms;
drop policy if exists "symptoms_insert_own" on public.symptoms;
drop policy if exists "symptoms_update_own" on public.symptoms;
drop policy if exists "symptoms_delete_own" on public.symptoms;

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
