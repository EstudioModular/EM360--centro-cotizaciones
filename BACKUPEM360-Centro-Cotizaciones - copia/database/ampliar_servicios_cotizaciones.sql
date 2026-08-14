-- Ejecutar una sola vez si ya había creado CotizacionesProveedores.

alter table public."CotizacionesProveedores"
drop constraint if exists "CotizacionesProveedores_servicio_check";

alter table public."CotizacionesProveedores"
drop constraint if exists cotizaciones_proveedores_servicio_valido;

alter table public."CotizacionesProveedores"
add constraint cotizaciones_proveedores_servicio_valido
check (servicio in (
    'ebanisteria',
    'marmoleros',
    'sheetrockeros',
    'plomeros',
    'electricistas',
    'piseros',
    'pintores',
    'tope'
));

notify pgrst, 'reload schema';
