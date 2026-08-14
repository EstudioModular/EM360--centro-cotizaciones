-- Repara el acceso del administrador sin borrar datos existentes.

insert into public."Perfiles" (id, nombre, rol)
select
    id,
    coalesce(raw_user_meta_data ->> 'nombre', split_part(email, '@', 1)),
    'Administrador'
from auth.users
where lower(email) = 'hector1811.hg@gmail.com'
on conflict (id) do update
set rol = 'Administrador';

alter table public."Perfiles" enable row level security;
grant select on public."Perfiles" to authenticated;

drop policy if exists "usuarios ven su perfil" on public."Perfiles";
create policy "usuarios ven su perfil"
on public."Perfiles"
for select
to authenticated
using (id = auth.uid() or (select public.es_administrador()));

notify pgrst, 'reload schema';
