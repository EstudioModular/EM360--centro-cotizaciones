-- Ejecutar DESPUÉS de database/auth_roles.sql y database/aprobacion_cotizaciones.sql.
-- Protege los datos de EM360 por rol:
-- Administrador: crea y administra.
-- Oficial: consulta y aprueba cotizaciones mediante una función controlada.
-- Consulta: solo consulta.

create or replace function public.es_oficial_o_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public."Perfiles"
        where id = auth.uid()
          and rol in ('Administrador', 'Oficial')
    );
$$;

-- Ningún visitante sin sesión puede acceder a los datos de la aplicación.
revoke all on table public."Proyectos" from anon;
revoke all on table public."Transferencias" from anon;
revoke all on table public."CotizacionesProveedores" from anon;
revoke all on storage.objects from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public."Proyectos" to authenticated;
grant select, insert, update, delete on table public."Transferencias" to authenticated;
grant select, insert, update, delete on table public."CotizacionesProveedores" to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

alter table public."Proyectos" enable row level security;
alter table public."Transferencias" enable row level security;
alter table public."CotizacionesProveedores" enable row level security;

-- Proyectos: todos los usuarios autenticados pueden consultar; solo Admin cambia datos.
drop policy if exists "authenticated consulta proyectos" on public."Proyectos";
create policy "authenticated consulta proyectos"
on public."Proyectos" for select to authenticated using (true);

drop policy if exists "administrador administra proyectos" on public."Proyectos";
create policy "administrador administra proyectos"
on public."Proyectos" for all to authenticated
using ((select public.es_administrador()))
with check ((select public.es_administrador()));

-- Transferencias: todos pueden leer; solo Admin crea, modifica o elimina.
drop policy if exists "authenticated consulta transferencias" on public."Transferencias";
create policy "authenticated consulta transferencias"
on public."Transferencias" for select to authenticated using (true);

drop policy if exists "administrador administra transferencias" on public."Transferencias";
create policy "administrador administra transferencias"
on public."Transferencias" for all to authenticated
using ((select public.es_administrador()))
with check ((select public.es_administrador()));

-- Cotizaciones: todos pueden leer; solo Admin puede crear o editar directamente.
drop policy if exists "authenticated consulta cotizaciones" on public."CotizacionesProveedores";
create policy "authenticated consulta cotizaciones"
on public."CotizacionesProveedores" for select to authenticated using (true);

drop policy if exists "administrador administra cotizaciones" on public."CotizacionesProveedores";
create policy "administrador administra cotizaciones"
on public."CotizacionesProveedores" for all to authenticated
using ((select public.es_administrador()))
with check ((select public.es_administrador()));

-- Los archivos siguen en buckets públicos para conservar las vistas previas actuales.
-- Con estas policies, solo un Administrador autenticado puede subir o borrar archivos.
drop policy if exists "authenticated consulta archivos em360" on storage.objects;
create policy "authenticated consulta archivos em360"
on storage.objects for select to authenticated
using (bucket_id in ('planos', 'transferencias', 'cotizaciones-proveedores'));

drop policy if exists "administrador sube archivos em360" on storage.objects;
create policy "administrador sube archivos em360"
on storage.objects for insert to authenticated
with check (
    bucket_id in ('planos', 'transferencias', 'cotizaciones-proveedores')
    and (select public.es_administrador())
);

drop policy if exists "administrador borra archivos em360" on storage.objects;
create policy "administrador borra archivos em360"
on storage.objects for delete to authenticated
using (
    bucket_id in ('planos', 'transferencias', 'cotizaciones-proveedores')
    and (select public.es_administrador())
);

-- Única vía de aprobación. Oficial o Administrador pueden aprobar una cotización pendiente,
-- pero no modificar el resto de sus datos.
create or replace function public.aprobar_cotizacion(cotizacion_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    nombre_usuario text;
begin
    if not (select public.es_oficial_o_administrador()) then
        raise exception 'No autorizado para aprobar cotizaciones';
    end if;

    select nombre into nombre_usuario
    from public."Perfiles"
    where id = auth.uid();

    update public."CotizacionesProveedores"
    set estado = 'Aprobada',
        aprobado_por = coalesce(nombre_usuario, 'Usuario autorizado'),
        aprobado_en = now()
    where id = cotizacion_id
      and coalesce(estado, 'Pendiente') = 'Pendiente';

    if not found then
        raise exception 'La cotización no existe o ya fue aprobada';
    end if;
end;
$$;

revoke all on function public.aprobar_cotizacion(bigint) from public;
grant execute on function public.aprobar_cotizacion(bigint) to authenticated;

notify pgrst, 'reload schema';
