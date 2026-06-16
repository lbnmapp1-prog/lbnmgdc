-- =============================================
-- PASTOREO GDC — Schema Supabase
-- Ejecuta esto en el SQL Editor de supabase.com
-- =============================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- GRUPOS DE CUIDADO
create table grupos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  sede text,
  created_at timestamptz default now()
);

-- PERFILES DE USUARIO (ligados a auth.users)
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'Miembro',
  grupo_id uuid references grupos(id),
  created_at timestamptz default now()
);

-- MIEMBROS
create table miembros (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  rol text not null default 'Miembro',
  grupo_id uuid references grupos(id),
  telefono text,
  correo text,
  fecha_nacimiento date,
  edad int generated always as (date_part('year', age(fecha_nacimiento))::int) stored,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EVENTOS
create table eventos (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  fecha date not null,
  hora text,
  lugar text,
  tipo text default 'reunion',
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table grupos enable row level security;
alter table perfiles enable row level security;
alter table miembros enable row level security;
alter table eventos enable row level security;

-- Usuarios autenticados pueden leer todo
create policy "Leer grupos" on grupos for select to authenticated using (true);
create policy "Leer miembros" on miembros for select to authenticated using (true);
create policy "Leer eventos" on eventos for select to authenticated using (true);
create policy "Leer perfil propio" on perfiles for select to authenticated using (auth.uid() = id);

-- Solo usuarios autenticados pueden escribir miembros y eventos
create policy "Escribir miembros" on miembros for all to authenticated using (true) with check (true);
create policy "Escribir eventos" on eventos for all to authenticated using (true) with check (true);
create policy "Actualizar perfil propio" on perfiles for update to authenticated using (auth.uid() = id);

-- Trigger para actualizar updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger miembros_updated_at before update on miembros
  for each row execute procedure update_updated_at();

-- Trigger para crear perfil al registrar usuario
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into perfiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'Pastor de Área');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- DATOS INICIALES
-- =============================================
insert into grupos (nombre, sede) values
  ('GDC Roca Firme', 'Sede Este'),
  ('GDC Nueva Vida', 'Sede Cabudare'),
  ('GDC Faro', 'Sede 48'),
  ('GDC Restauración', 'Sede Oeste');

insert into eventos (titulo, fecha, hora, lugar, tipo) values
  ('Reunión de Líderes', '2026-06-05', '7:00 PM', 'Templo principal', 'reunion'),
  ('Noche de Jóvenes Adultos', '2026-06-12', '6:30 PM', 'Auditorio', 'evento'),
  ('Servicio General', '2026-06-13', '9:00 AM', 'Templo principal', 'servicio'),
  ('Capacitación Líder de Cuidado', '2026-06-19', '5:00 PM', 'Salón 3', 'capacitacion'),
  ('Retiro DARTE', '2026-06-21', 'Todo el día', 'Campamento El Edén', 'retiro'),
  ('Reunión Padres Espirituales', '2026-06-27', '7:00 PM', 'Salón 1', 'reunion');
