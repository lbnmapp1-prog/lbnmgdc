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
  claves text[] := array['dios','familia','relaciones','amigos','dinero','profesion','vida_adulta','ocio'];
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
    (p_valores->>'amigos')::int, null, (p_valores->>'dinero')::int,
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
-- REGISTRO PÚBLICO (formulario de inscripción sin cuenta)
-- =============================================

create table if not exists registros_pendientes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  nombre        text not null,
  telefono      text,
  correo        text,
  fecha_nacimiento date,
  estado_civil  text,
  grupo_nombre  text,
  como_llego    text,
  estado        text not null default 'Pendiente', -- Pendiente | Aprobado | Rechazado
  notas_lider   text
);

-- Solo authenticated puede leer y actualizar; anon solo vía RPC
alter table registros_pendientes enable row level security;
create policy "registros_read_auth"   on registros_pendientes for select to authenticated using (true);
create policy "registros_update_auth" on registros_pendientes for update to authenticated using (true);
create policy "registros_delete_auth" on registros_pendientes for delete to authenticated using (true);

create or replace function registro_publico_enviar(p_datos jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_nombre       text;
  v_telefono     text;
  v_correo       text;
  v_fecha        date;
  v_estado_civil text;
  v_grupo        text;
  v_como        text;
begin
  -- nombre obligatorio, 2–100 chars, solo texto
  v_nombre := trim(left(coalesce(p_datos->>'nombre',''), 100));
  if length(v_nombre) < 2 then raise exception 'El nombre es requerido.'; end if;
  if v_nombre !~ '^[A-Za-záéíóúÁÉÍÓÚüÜñÑ ''.\-]+$' then raise exception 'El nombre contiene caracteres no permitidos.'; end if;

  -- teléfono: solo dígitos y +, 7-20 chars
  v_telefono := regexp_replace(coalesce(p_datos->>'telefono',''), '[^0-9+]', '', 'g');
  v_telefono := left(v_telefono, 20);
  if length(v_telefono) > 0 and length(v_telefono) < 7 then raise exception 'El teléfono debe tener al menos 7 dígitos.'; end if;

  -- correo: formato válido
  v_correo := lower(trim(left(coalesce(p_datos->>'correo',''), 100)));
  if length(v_correo) > 0 and v_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'El correo no tiene un formato válido.';
  end if;

  -- estado civil: solo valores permitidos
  v_estado_civil := coalesce(p_datos->>'estado_civil','');
  if v_estado_civil <> '' and v_estado_civil not in ('Soltero/a','Casado/a','Divorciado/a','Viudo/a','Unión libre') then
    raise exception 'Estado civil inválido.';
  end if;

  -- fecha de nacimiento
  begin
    if coalesce(p_datos->>'fecha_nacimiento','') <> '' then
      v_fecha := (p_datos->>'fecha_nacimiento')::date;
      if v_fecha > current_date - interval '10 years' or v_fecha < current_date - interval '100 years' then
        raise exception 'Fecha de nacimiento inválida.';
      end if;
    end if;
  exception when others then raise exception 'Fecha de nacimiento inválida.'; end;

  -- campos de texto libre: truncar y limpiar
  v_grupo := left(trim(regexp_replace(coalesce(p_datos->>'grupo_nombre',''), '[<>"''\\]', '', 'g')), 100);
  v_como  := left(trim(regexp_replace(coalesce(p_datos->>'como_llego',''),   '[<>"''\\]', '', 'g')), 300);

  -- límite anti-spam: 2 solicitudes pendientes por teléfono
  if length(v_telefono) > 0 and
     (select count(*) from registros_pendientes where telefono = v_telefono and estado = 'Pendiente') >= 2 then
    raise exception 'Ya tienes una solicitud pendiente. Espera a que tu líder la revise.';
  end if;

  insert into registros_pendientes (nombre, telefono, correo, fecha_nacimiento, estado_civil, grupo_nombre, como_llego)
  values (v_nombre, nullif(v_telefono,''), nullif(v_correo,''), v_fecha,
          nullif(v_estado_civil,''), nullif(v_grupo,''), nullif(v_como,''));
end;
$$;

revoke all on function registro_publico_enviar(jsonb) from public;
grant execute on function registro_publico_enviar(jsonb) to anon, authenticated;

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

-- ================================================================
-- MÓDULOS HERRAMIENTAS (agregados en la segunda fase)
-- ================================================================

-- Anexo A: Nuevos Equipos de Liderazgo
create table if not exists nuevos_equipos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid references grupos(id) on delete set null,
  area        text,
  pastor      text,
  telefonos   text,
  lider       text,
  nuevo_lider text,
  eq1_lider   text,
  eq2_nuevo_lider text,
  motivos_oracion text,
  anfitrion   text,
  direccion_anfitrion text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);
alter table nuevos_equipos enable row level security;
create policy "equipos_select" on nuevos_equipos for select using (es_admin() or grupo_id = auth_grupo_id());
create policy "equipos_insert" on nuevos_equipos for insert with check (es_admin() or grupo_id = auth_grupo_id());
create policy "equipos_update" on nuevos_equipos for update using (es_admin() or grupo_id = auth_grupo_id());
create policy "equipos_delete" on nuevos_equipos for delete using (es_admin() or grupo_id = auth_grupo_id());

-- Anexo B & C: Planeador Mensual
create table if not exists planeador (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid references grupos(id) on delete set null,
  area        text,
  lider       text,
  pastor      text,
  mes         text,
  material    text,
  equipo_base text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);
alter table planeador enable row level security;
create policy "planeador_select" on planeador for select using (es_admin() or grupo_id = auth_grupo_id());
create policy "planeador_insert" on planeador for insert with check (es_admin() or grupo_id = auth_grupo_id());
create policy "planeador_update" on planeador for update using (es_admin() or grupo_id = auth_grupo_id());
create policy "planeador_delete" on planeador for delete using (es_admin() or grupo_id = auth_grupo_id());

create table if not exists planeador_reuniones (
  id              uuid primary key default gen_random_uuid(),
  planeador_id    uuid references planeador(id) on delete cascade,
  fase            text,
  fecha           date,
  refrigerio_resp text, refrigerio_obs text,
  dinamicas_resp  text, dinamicas_obs  text,
  adoracion_resp  text, adoracion_obs  text,
  tema_resp       text, tema_obs       text,
  reflexion_resp  text, reflexion_obs  text,
  anuncios_resp   text, anuncios_obs   text
);
alter table planeador_reuniones enable row level security;
create policy "reun_select" on planeador_reuniones for select using (
  exists (select 1 from planeador p where p.id = planeador_id and (es_admin() or p.grupo_id = auth_grupo_id()))
);
create policy "reun_insert" on planeador_reuniones for insert with check (
  exists (select 1 from planeador p where p.id = planeador_id and (es_admin() or p.grupo_id = auth_grupo_id()))
);
create policy "reun_delete" on planeador_reuniones for delete using (
  exists (select 1 from planeador p where p.id = planeador_id and (es_admin() or p.grupo_id = auth_grupo_id()))
);

-- Anexo E: Ofrendas Misioneras
create table if not exists ofrendas (
  id                  uuid primary key default gen_random_uuid(),
  grupo_id            uuid references grupos(id) on delete set null,
  grupo_nombre        text,
  lider_nombre        text,
  encargado           text,
  pastor              text,
  fecha               date,
  nro_miembros        integer default 0,
  aporte_lider        numeric default 0,
  total_ofrenda       numeric default 0,
  fecha_entrega_lider date,
  fecha_envio_area    date,
  created_by          uuid references auth.users(id),
  created_at          timestamptz default now()
);
alter table ofrendas enable row level security;
create policy "ofrendas_select" on ofrendas for select using (es_admin() or grupo_id = auth_grupo_id());
create policy "ofrendas_insert" on ofrendas for insert with check (es_admin() or grupo_id = auth_grupo_id());
create policy "ofrendas_update" on ofrendas for update using (es_admin() or grupo_id = auth_grupo_id());
create policy "ofrendas_delete" on ofrendas for delete using (es_admin() or grupo_id = auth_grupo_id());

create table if not exists ofrenda_items (
  id              uuid primary key default gen_random_uuid(),
  ofrenda_id      uuid references ofrendas(id) on delete cascade,
  miembro_nombre  text,
  monto           numeric default 0,
  nro_transferencia text,
  fecha           date
);
alter table ofrenda_items enable row level security;
create policy "items_select" on ofrenda_items for select using (
  exists (select 1 from ofrendas o where o.id = ofrenda_id and (es_admin() or o.grupo_id = auth_grupo_id()))
);
create policy "items_insert" on ofrenda_items for insert with check (
  exists (select 1 from ofrendas o where o.id = ofrenda_id and (es_admin() or o.grupo_id = auth_grupo_id()))
);
create policy "items_delete" on ofrenda_items for delete using (
  exists (select 1 from ofrendas o where o.id = ofrenda_id and (es_admin() or o.grupo_id = auth_grupo_id()))
);
