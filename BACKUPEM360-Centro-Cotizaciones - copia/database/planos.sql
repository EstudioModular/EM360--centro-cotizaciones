-- Ejecutar una sola vez en Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('planos', 'planos', true)
on conflict (id) do update set public = true;

drop policy if exists "anon puede ver planos" on storage.objects;
create policy "anon puede ver planos"
on storage.objects
for select
to anon
using (bucket_id = 'planos');

drop policy if exists "anon puede subir planos" on storage.objects;
create policy "anon puede subir planos"
on storage.objects
for insert
to anon
with check (bucket_id = 'planos');
