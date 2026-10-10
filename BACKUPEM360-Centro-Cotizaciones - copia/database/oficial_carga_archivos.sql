-- Ejecutar en Supabase SQL Editor después de rls_roles.sql y hoja_levantamiento.sql.

grant insert on table public."Transferencias" to authenticated;
grant insert, delete on table storage.objects to authenticated;

drop policy if exists "oficial crea transferencias" on public."Transferencias";
create policy "oficial crea transferencias"
on public."Transferencias" for insert to authenticated
with check ((select public.es_oficial_o_administrador()));

drop policy if exists "oficial sube archivos operativos" on storage.objects;
create policy "oficial sube archivos operativos"
on storage.objects for insert to authenticated
with check (
    bucket_id in ('hojas-levantamiento', 'transferencias')
    and (select public.es_oficial_o_administrador())
);

drop policy if exists "oficial elimina archivos operativos" on storage.objects;
create policy "oficial elimina archivos operativos"
on storage.objects for delete to authenticated
using (
    bucket_id in ('hojas-levantamiento', 'transferencias')
    and (select public.es_oficial_o_administrador())
);