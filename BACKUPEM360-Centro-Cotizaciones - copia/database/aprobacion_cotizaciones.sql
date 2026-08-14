-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public."CotizacionesProveedores"
add column if not exists estado text;

alter table public."CotizacionesProveedores"
add column if not exists aprobado_por text;

alter table public."CotizacionesProveedores"
add column if not exists aprobado_en timestamptz;

update public."CotizacionesProveedores"
set estado = 'Pendiente'
where estado is null;

alter table public."CotizacionesProveedores"
alter column estado set default 'Pendiente';

alter table public."CotizacionesProveedores"
alter column estado set not null;

alter table public."CotizacionesProveedores"
drop constraint if exists cotizaciones_proveedores_estado_valido;

alter table public."CotizacionesProveedores"
add constraint cotizaciones_proveedores_estado_valido
check (estado in ('Pendiente', 'Aprobada'));

grant update on table public."CotizacionesProveedores" to anon;

drop policy if exists "anon puede aprobar cotizaciones" on public."CotizacionesProveedores";
create policy "anon puede aprobar cotizaciones"
on public."CotizacionesProveedores"
for update
to anon
using (true)
with check (true);

notify pgrst, 'reload schema';
