-- Ejecutar DESPUÉS de portal_proveedores.sql.
-- Permite que el proveedor vea el resultado de sus propias cotizaciones.

alter table public."CotizacionesProveedores"
add column if not exists proveedor_usuario_id uuid references auth.users(id) on delete set null;

alter table public."CotizacionesProveedores"
add column if not exists respuesta_administrador text;

create index if not exists idx_cotizaciones_proveedor_usuario
on public."CotizacionesProveedores" (proveedor_usuario_id, created_at desc);

alter table public."CotizacionesProveedores"
drop constraint if exists cotizaciones_proveedores_estado_valido;

alter table public."CotizacionesProveedores"
add constraint cotizaciones_proveedores_estado_valido
check (estado in ('Pendiente', 'Aprobada', 'Declinada'));

create or replace function public.resolver_cotizacion(
    cotizacion_id bigint,
    estado_nuevo text,
    respuesta text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    nombre_usuario text;
begin
    if not (select public.es_oficial_o_administrador()) then
        raise exception 'No autorizado para resolver cotizaciones';
    end if;

    if estado_nuevo not in ('Aprobada', 'Declinada') then
        raise exception 'Estado no válido';
    end if;

    select nombre into nombre_usuario from public."Perfiles" where id = auth.uid();

    update public."CotizacionesProveedores"
    set estado = estado_nuevo,
        aprobado_por = coalesce(nombre_usuario, 'Usuario autorizado'),
        aprobado_en = now(),
        respuesta_administrador = nullif(trim(respuesta), '')
    where id = cotizacion_id and estado = 'Pendiente';

    if not found then
        raise exception 'La cotización no existe o ya fue resuelta';
    end if;
end;
$$;

revoke all on function public.resolver_cotizacion(bigint, text, text) from public;
grant execute on function public.resolver_cotizacion(bigint, text, text) to authenticated;

notify pgrst, 'reload schema';
