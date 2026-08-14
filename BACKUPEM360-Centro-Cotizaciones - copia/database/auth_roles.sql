-- Ejecutar una sola vez en Supabase SQL Editor.
-- El correo indicado será el primer administrador de EM360.

create table if not exists public."Perfiles" (
    id uuid primary key references auth.users(id) on delete cascade,
    nombre text,
    rol text not null default 'Consulta' check (rol in ('Administrador', 'Oficial', 'Consulta')),
    created_at timestamptz not null default now()
);

alter table public."Perfiles" enable row level security;

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public."Perfiles" (id, nombre, rol)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
        case
            when lower(new.email) = 'hector1811.hg@gmail.com' then 'Administrador'
            else 'Consulta'
        end
    );
    return new;
end;
$$;

drop trigger if exists crear_perfil_al_registrar on auth.users;
create trigger crear_perfil_al_registrar
after insert on auth.users
for each row execute procedure public.crear_perfil_usuario();

insert into public."Perfiles" (id, nombre, rol)
select
    id,
    coalesce(raw_user_meta_data ->> 'nombre', split_part(email, '@', 1)),
    case
        when lower(email) = 'hector1811.hg@gmail.com' then 'Administrador'
        else 'Consulta'
    end
from auth.users
on conflict (id) do nothing;

update public."Perfiles"
set rol = 'Administrador'
where id in (
    select id from auth.users where lower(email) = 'hector1811.hg@gmail.com'
);

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public."Perfiles"
        where id = auth.uid() and rol = 'Administrador'
    );
$$;

grant select on public."Perfiles" to authenticated;
grant update (rol) on public."Perfiles" to authenticated;

drop policy if exists "usuarios ven su perfil" on public."Perfiles";
create policy "usuarios ven su perfil"
on public."Perfiles"
for select
to authenticated
using (id = auth.uid() or (select public.es_administrador()));

drop policy if exists "administradores gestionan roles" on public."Perfiles";
create policy "administradores gestionan roles"
on public."Perfiles"
for update
to authenticated
using ((select public.es_administrador()))
with check ((select public.es_administrador()));

notify pgrst, 'reload schema';
