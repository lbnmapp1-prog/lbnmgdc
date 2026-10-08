-- =============================================
-- PASTOREO GDC — Esquema Supabase (v3)
-- Ejecuta este archivo completo en el SQL Editor de Supabase, en un proyecto
-- NUEVO y vacío. Después corre scripts/migrar-airtable-a-supabase.mjs.
-- =============================================

-- Columnas `airtable_id`: solo sirven para la migración (hacerla repetible sin
-- duplicar datos). Una vez cerrada la migración se pueden eliminar.

create table grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sede text,
  airtable_id text unique,
  created_at timestamptz default now()
);

-- Usuarios del sistema (login). Ligado 1:1 a auth.users.
-- El email se duplica aquí porque el cliente no puede leer auth.users.
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
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol text not null default 'Miembro',
  grupo_id uuid references grupos(id) on delete set null,
  telefono text,
  correo text,
  fecha_nacimiento date,
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
  airtable_id text unique,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora text,
  lugar text,
  tipo text default 'reunion',
  airtable_id text unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Citas de seguimiento / discipulado. `area` es una de las 9 áreas de la rueda.
create table seguimientos (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references miembros(id) on delete cascade,
  miembro_nombre text,
  grupo_id uuid references grupos(id) on delete set null,
  fecha date,
  hora text,
  temas text,
  proximos_pasos text,
  versiculos text,
  estado text not null default 'Programada'
    check (estado in ('Programada','Realizada','Cancelada')),
  notas text,
  lider_nombre text,
  area text check (area in ('Dios','Familia','Relaciones','Amigos','Salud','Dinero','Profesion','VidaAdulta','Ocio')),
  preguntas text,
  puntuacion smallint check (puntuacion between 1 and 10),
  airtable_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rueda de vida: 9 áreas del 1 al 10. Una evaluación puede ser parcial
-- (una sola área, al cerrar una cita), por eso las columnas admiten null.
create table evaluaciones (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references miembros(id) on delete cascade,
  miembro_nombre text,
  grupo_id uuid references grupos(id) on delete set null,
  fecha date not null default current_date,
  fuente text not null default 'Líder' check (fuente in ('Líder','Autoevaluación')),
  estado text not null default 'Aprobada' check (estado in ('Pendiente','Aprobada','Rechazada')),
  dios        smallint check (dios between 1 and 10),
  familia     smallint check (familia between 1 and 10),
  relaciones  smallint check (relaciones between 1 and 10),
  amigos      smallint check (amigos between 1 and 10),
  salud       smallint check (salud between 1 and 10),
  dinero      smallint check (dinero between 1 and 10),
  profesion   smallint check (profesion between 1 and 10),
  vida_adulta smallint check (vida_adulta between 1 and 10),
  ocio        smallint check (ocio between 1 and 10),
  comentario text,
  lider_nombre text,
  seguimiento_id uuid references seguimientos(id) on delete set null,
  airtable_id text unique,
  created_at timestamptz default now()
);

-- Organizador de Temas: 5 pilares x 5 clases, con PDF opcional (Storage, bucket `clases`).
create table clases (
  id uuid primary key default gen_random_uuid(),
  pilar text not null,
  orden int not null default 0,
  titulo text not null,
  fecha date,
  hora text,
  descripcion text,
  archivo_path text,
  archivo_nombre text,
  archivo_size int,
  airtable_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Asistencia (aún sin pantalla en la app; se migran los datos existentes).
create table reuniones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  grupo_id uuid references grupos(id) on delete set null,
  grupo_nombre text,
  tipo text,
  lider_nombre text,
  notas text,
  airtable_id text unique,
  created_at timestamptz default now()
);

create table asistencias (
  id uuid primary key default gen_random_uuid(),
  reunion_id uuid references reuniones(id) on delete cascade,
  miembro_id uuid references miembros(id) on delete cascade,
  miembro_nombre text,
  grupo_id uuid references grupos(id) on delete set null,
  fecha date,
  estado text,
  airtable_id text unique,
  created_at timestamptz default now()
);

-- Bitácora de acciones sensibles. Nunca se borra desde el cliente.
create table auditoria (
  id uuid primary key default gen_random_uuid(),
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
create index idx_seguimientos_grupo on seguimientos(grupo_id);
create index idx_seguimientos_miembro on seguimientos(miembro_id);
create index idx_evaluaciones_miembro on evaluaciones(miembro_id);
create index idx_evaluaciones_grupo on evaluaciones(grupo_id);
create index idx_asistencias_reunion on asistencias(reunion_id);

-- =============================================
-- FUNCIONES AUXILIARES (security definer: evitan recursión de RLS)
-- =============================================

create or replace function auth_rol() returns text
language sql security definer stable set search_path = public
as $$ select rol from perfiles where id = auth.uid(); $$;

create or replace function auth_grupo_id() returns uuid
language sql security definer stable set search_path = public
as $$ select grupo_id from perfiles where id = auth.uid(); $$;

create or replace function es_admin() returns boolean
language sql security definer stable set search_path = public
as $$ select coalesce(auth_rol(), '') in ('Pastor de Área','Líder Asesor','Super Usuario'); $$;

create or replace function es_pastor_o_super() returns boolean
language sql security definer stable set search_path = public
as $$ select coalesce(auth_rol(), '') in ('Pastor de Área','Super Usuario'); $$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table grupos        enable row level security;
alter table perfiles      enable row level security;
alter table miembros      enable row level security;
alter table eventos       enable row level security;
alter table seguimientos  enable row level security;
alter table evaluaciones  enable row level security;
alter table clases        enable row level security;
alter table reuniones     enable row level security;
alter table asistencias   enable row level security;
alter table auditoria     enable row level security;

-- GRUPOS: cualquier usuario autenticado lee; solo admins escriben.
create policy grupos_select on grupos for select to authenticated using (true);
create policy grupos_write on grupos for all to authenticated using (es_admin()) with check (es_admin());

-- PERFILES: cada quien lee el suyo; los admins leen todos.
create policy perfiles_select_own on perfiles for select to authenticated using (id = auth.uid());
create policy perfiles_select_admin on perfiles for select to authenticated using (es_admin());
-- Un usuario puede editar su nombre, pero NO su rol ni su grupo (evita auto-escalar privilegios).
create policy perfiles_update_own on perfiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol = auth_rol() and grupo_id is not distinct from auth_grupo_id());
create policy perfiles_update_admin on perfiles for update to authenticated
  using (es_admin())
  with check (es_admin() and (rol not in ('Pastor de Área','Super Usuario') or es_pastor_o_super()));
-- Sin policy de INSERT/DELETE: los usuarios se crean y borran solo desde /api/admin-users (service_role).

-- MIEMBROS y datos por grupo: admins todo; un líder solo su propio grupo.
create policy miembros_all on miembros for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());
create policy seguimientos_all on seguimientos for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());
create policy evaluaciones_all on evaluaciones for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());
create policy reuniones_all on reuniones for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());
create policy asistencias_all on asistencias for all to authenticated
  using (es_admin() or grupo_id = auth_grupo_id())
  with check (es_admin() or grupo_id = auth_grupo_id());

-- EVENTOS y CLASES: cualquier autenticado lee; solo admins escriben.
create policy eventos_select on eventos for select to authenticated using (true);
create policy eventos_write on eventos for all to authenticated using (es_admin()) with check (es_admin());
create policy clases_select on clases for select to authenticated using (true);
create policy clases_write on clases for all to authenticated using (es_admin()) with check (es_admin());

-- AUDITORIA: solo Pastor de Área / Super Usuario leen; cualquiera inserta una fila propia.
create policy auditoria_select on auditoria for select to authenticated using (es_pastor_o_super());
create policy auditoria_insert on auditoria for insert to authenticated with check (actor_id = auth.uid());

-- =============================================
-- STORAGE: PDFs del Organizador de Temas (bucket privado; se leen con URL firmada)
-- =============================================
insert into storage.buckets (id, name, public) values ('clases', 'clases', false)
  on conflict (id) do nothing;

create policy clases_files_read on storage.objects for select to authenticated
  using (bucket_id = 'clases');
create policy clases_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clases' and es_admin());
create policy clases_files_update on storage.objects for update to authenticated
  using (bucket_id = 'clases' and es_admin());
create policy clases_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clases' and es_admin());

-- =============================================
-- FUNCIONES PARA EL CLIENTE
-- =============================================

-- Lista básica de usuarios (sin correo) para el organigrama; la ve cualquier usuario autenticado.
create or replace function listar_usuarios_basico()
returns table (id uuid, nombre text, rol text, grupo_id uuid)
language sql security definer stable set search_path = public
as $$ select id, nombre, rol, grupo_id from perfiles order by nombre; $$;

-- Autoevaluación pública (enlace que se envía al miembro, sin cuenta).
-- El enlace usa el id del miembro (uuid aleatorio de 122 bits). Todo lo que entra
-- queda como 'Pendiente' hasta que el líder la apruebe, y hay un tope de 3 pendientes.
create or replace function evaluacion_publica_info(p_miembro uuid)
returns text
language sql security definer stable set search_path = public
as $$ select split_part(nombre, ' ', 1) from miembros where id = p_miembro; $$;

create or replace function evaluacion_publica_enviar(p_miembro uuid, p_valores jsonb, p_comentario text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m miembros%rowtype;
  k text;
  claves text[] := array['dios','familia','relaciones','amigos','salud','dinero','profesion','vida_adulta','ocio'];
begin
  select * into m from miembros where id = p_miembro;
  if not found then raise exception 'Enlace inválido.'; end if;

  if p_valores is null or jsonb_typeof(p_valores) <> 'object' then
    raise exception 'Responde todas las áreas con un número del 1 al 10.';
  end if;
  foreach k in array claves loop
    if jsonb_typeof(p_valores -> k) is distinct from 'number' or (p_valores ->> k) !~ '^(10|[1-9])$' then
      raise exception 'Responde todas las áreas con un número del 1 al 10.';
    end if;
  end loop;

  if (select count(*) from evaluaciones where miembro_id = p_miembro and estado = 'Pendiente') >= 3 then
    raise exception 'Ya enviaste tu evaluación. Espera a que tu líder la revise.';
  end if;

  insert into evaluaciones (miembro_id, miembro_nombre, grupo_id, fecha, fuente, estado,
    dios, familia, relaciones, amigos, salud, dinero, profesion, vida_adulta, ocio, comentario)
  values (m.id, m.nombre, m.grupo_id, current_date, 'Autoevaluación', 'Pendiente',
    (p_valores->>'dios')::int, (p_valores->>'familia')::int, (p_valores->>'relaciones')::int,
    (p_valores->>'amigos')::int, (p_valores->>'salud')::int, (p_valores->>'dinero')::int,
    (p_valores->>'profesion')::int, (p_valores->>'vida_adulta')::int, (p_valores->>'ocio')::int,
    left(coalesce(p_comentario, ''), 1000));
end;
$$;

revoke all on function evaluacion_publica_info(uuid) from public;
revoke all on function evaluacion_publica_enviar(uuid, jsonb, text) from public;
grant execute on function evaluacion_publica_info(uuid) to anon, authenticated;
grant execute on function evaluacion_publica_enviar(uuid, jsonb, text) to anon, authenticated;
revoke all on function listar_usuarios_basico() from public;
grant execute on function listar_usuarios_basico() to authenticated;

-- =============================================
-- TRIGGERS
-- =============================================

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_miembros_updated     before update on miembros     for each row execute function set_updated_at();
create trigger trg_eventos_updated      before update on eventos      for each row execute function set_updated_at();
create trigger trg_perfiles_updated     before update on perfiles     for each row execute function set_updated_at();
create trigger trg_seguimientos_updated before update on seguimientos for each row execute function set_updated_at();
create trigger trg_clases_updated       before update on clases       for each row execute function set_updated_at();

-- Registra quién creó/editó cada ficha de miembro. Durante la migración
-- (service_role) auth.uid() es null y se deja tal cual.
create or replace function set_miembro_audit_columns() returns trigger
language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    new.created_by = coalesce(auth.uid(), new.created_by);
    new.updated_by = coalesce(auth.uid(), new.updated_by);
  elsif TG_OP = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), old.updated_by);
    new.created_by = old.created_by;
  end if;
  return new;
end; $$;

create trigger trg_miembros_audit before insert or update on miembros
  for each row execute function set_miembro_audit_columns();

create or replace function set_evento_created_by() returns trigger
language plpgsql security definer as $$
begin new.created_by = coalesce(auth.uid(), new.created_by); return new; end; $$;

create trigger trg_eventos_created before insert on eventos
  for each row execute function set_evento_created_by();
