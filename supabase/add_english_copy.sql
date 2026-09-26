-- Wavelength: English copy of each entry (run AFTER schema.sql). Safe to run twice.
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- patient_input_en holds an English translation of patient_input for entries
-- logged in another language (null for English entries).

alter table public.symptoms add column if not exists patient_input_en text;
