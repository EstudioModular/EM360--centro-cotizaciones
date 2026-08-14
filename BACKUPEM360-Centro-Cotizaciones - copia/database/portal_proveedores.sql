-- Ejecutar DESPUÉS de database/rls_roles.sql.
-- Habilita el portal seguro de proveedores externos.

alter table public."Perfiles"
add column if not exists es_proveedor_portal boolean not null default false;

grant update (rol, es_proveedor_portal) on public."Perfiles" to authenticated;

create or replace function public.es_proveedor_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select (select public.es_administrador()) or exists (
        select 1
        from public."Perfiles"
        where id = auth.uid() and es_proveedor_portal = true
    );
$$;

-- Solo un administrador puede habilitar una cuenta ya invitada como proveedor.
create or replace function public.activar_acceso_proveedor(correo_proveedor text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not (select public.es_administrador()) then
        raise exception 'Solo un administrador puede activar proveedores';
    end if;

    update public."Perfiles"
    set es_proveedor_portal = true
    where id = (
        select id
        from auth.users
        where lower(email) = lower(trim(correo_proveedor))
        limit 1
    );

    if not found then
        raise exception 'No existe una cuenta invitada con ese correo';
    end if;
end;
$$;

revoke all on function public.activar_acceso_proveedor(text) from public;
grant execute on function public.activar_acceso_proveedor(text) to authenticated;

-- Un proveedor habilitado solo puede insertar sus propias cotizaciones desde el portal.
drop policy if exists "proveedor crea cotizaciones" on public."CotizacionesProveedores";
create policy "proveedor crea cotizaciones"
on public."CotizacionesProveedores" for insert to authenticated
with check ((select public.es_proveedor_portal()));

drop policy if exists "proveedor sube archivos de cotizacion" on storage.objects;
create policy "proveedor sube archivos de cotizacion"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'cotizaciones-proveedores'
    and name like ('portal/' || auth.uid()::text || '/%')
    and (select public.es_proveedor_portal())
);

notify pgrst, 'reload schema';
