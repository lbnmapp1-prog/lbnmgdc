-- =============================================
-- PASTOREO GDC — Schema Supabase (v2, seguro)
-- Ejecuta esto completo en el SQL Editor de supabase.com
-- en un proyecto NUEVO, antes de correr supabase/migracion_datos.sql
-- =============================================

create extension if not exists "uuid-ossp";

-- =============================================
-- TABLAS
-- =============================================

create table grupos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  sede text,
  created_at timestamptz default now()
);

-- Usuarios del sistema (login). Ligado 1:1 a auth.users.
-- El email se duplica aquí (además de vivir en auth.users) porque el
-- cliente no tiene acceso de lectura a auth.users; así el panel de
-- administración puede listar usuarios sin necesitar la service_role key.
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'Líder de Grupo'
    check (rol in ('Líder de Grupo','Líder Asesor','Pastor de Área','Super Usuario')),
  grupo_id uuid references grupos(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table miembros (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  rol text not null default 'Miembro'
    check (rol in ('Miembro','Líder Asistente','Padre Espiritual','Líder de Grupo')),
  grupo_id uuid references grupos(id) on delete set null,
  telefono text,
  correo text,
  fecha_nacimiento date,
  edad int generated always as (
    case when fecha_nacimiento is null then null
    else date_part('year', age(fecha_nacimiento))::int end
  ) stored,
  estado_civil text default 'Soltero',
  nro_hijos int default 0,
  edades_hijos text,
  aniversario text,
  profesion text,
  ocupacion text,
  tiempo_iglesia text,
  direccion text,
  bautizado boolean default false,
  padre_esp text,
  disc_inicio text,
  disc_fin text,
  dones text,
  habilidades text,
  temperamentos text[] default '{}',
  mentor text,
  oracion text,
  nivel_idx int default 0,
  cursos_completados text[] default '{}',
  apoyo_completados text[] default '{}',
  sede text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table eventos (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  fecha date not null,
  hora text,
  lugar text,
  tipo text default 'reunion',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bitácora de acciones sensibles (creación/edición de usuarios, reseteo de
-- claves, borrado de fichas). Nunca se borra desde el cliente.
create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  created_at timestamptz default now()
);

create index idx_miembros_grupo on miembros(grupo_id);
create index idx_eventos_fecha on eventos(fecha);
create index idx_perfiles_grupo on perfiles(grupo_id);

-- =============================================
-- FUNCIONES AUXILIARES (security definer para evitar
-- recursión de RLS al consultar la propia tabla perfiles)
-- =============================================

create or replace function auth_rol()
returns text
language sql security definer stable set search_path = public
as $$ select rol from perfiles where id = auth.uid(); $$;

create or replace function auth_grupo_id()
returns uuid
language sql security definer stable set search_path = public
as $$ select grupo_id from perfiles where id = auth.uid(); $$;

create or replace function es_admin()
returns boolean
language sql security definer stable set search_path = public
as $$ select coalesce(auth_rol(), '') in ('Pastor de Área','Líder Asesor','Super Usuario'); $$;

create or replace function es_pastor_o_super()
returns boolean
language sql security definer stable set search_path = public
as $$ select coalesce(auth_rol(), '') in ('Pastor de Área','Super Usuario'); $$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table grupos enable row level security;
alter table perfiles enable row level security;
alter table miembros enable row level security;
alter table eventos enable row level security;
alter table auditoria enable row level security;

-- GRUPOS: cualquier usuario autenticado puede leer; solo admins escriben.
create policy grupos_select on grupos for select to authenticated using (true);
create policy grupos_write on grupos for all to authenticated using (es_admin()) with check (es_admin());

-- PERFILES: cada quien lee su propio perfil; los admins leen todos.
create policy perfiles_select_own on perfiles for select to authenticated using (id = auth.uid());
create policy perfiles_select_admin on perfiles for select to authenticated using (es_admin());
-- Un usuario puede editar su propio nombre, pero NO su rol ni su grupo (evita auto-escalar privilegios).
create policy perfiles_update_own on perfiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol = auth_rol() and grupo_id is not distinct from auth_grupo_id());
-- Los admins editan a otros, pero solo Pastor de Área / Super Usuario pueden asignar esos dos roles.
create policy perfiles_update_admin on perfiles for update to authenticated
  using (es_admin())
  with check (es_admin() and (rol not in ('Pastor de Área','Super Usuario') or es_pastor_o_super()));
-- No hay policy de INSERT/DELETE para el cliente: los usuarios se crean/eliminan
-- solo a través de la Edge Function admin-users (con la service_role key).

-- MIEMBROS: admins ven/editan todo; un líder solo su propio grupo.
create policy miembros_select on miembros for select to authenticated
  using (es_admin() or grupo_id = auth_grupo_id());
create policy miembros_write on miembros for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());

-- EVENTOS: cualquier autenticado lee; solo admins escriben.
create policy eventos_select on eventos for select to authenticated using (true);
create policy eventos_write on eventos for all to authenticated using (es_admin()) with check (es_admin());

-- AUDITORIA: solo Pastor de Área / Super Usuario pueden leerla; cualquiera
-- puede insertar una fila propia (actor_id debe ser quien está autenticado).
create policy auditoria_select on auditoria for select to authenticated using (es_pastor_o_super());
create policy auditoria_insert on auditoria for insert to authenticated with check (actor_id = auth.uid());

-- =============================================
-- TRIGGERS
-- =============================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_miembros_updated before update on miembros
  for each row execute function set_updated_at();
create trigger trg_eventos_updated before update on eventos
  for each row execute function set_updated_at();
create trigger trg_perfiles_updated before update on perfiles
  for each row execute function set_updated_at();

-- Registra automáticamente quién creó/editó cada ficha de miembro.
create or replace function set_miembro_audit_columns()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  elsif TG_OP = 'UPDATE' then
    new.updated_by = auth.uid();
    new.created_by = old.created_by;
  end if;
  return new;
end; $$;

create trigger trg_miembros_audit before insert or update on miembros
  for each row execute function set_miembro_audit_columns();

create or replace function set_evento_created_by()
returns trigger language plpgsql security definer as $$
begin new.created_by = auth.uid(); return new; end; $$;

create trigger trg_eventos_created before insert on eventos
  for each row execute function set_evento_created_by();

-- =============================================
-- Nota: no hay datos semilla aquí. Los datos reales existentes se
-- cargan aparte con supabase/migracion_datos.sql (grupos/miembros/eventos)
-- y supabase/migrar_usuarios.mjs (usuarios del sistema, vía Auth Admin API).
-- =============================================
