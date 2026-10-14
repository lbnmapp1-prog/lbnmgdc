-- =============================================
-- MIGRACIÓN AIRTABLE → SUPABASE (datos embebidos)
-- Generado automáticamente el 2026-10-14 desde Airtable base apppQCdCQ211ydjbA
-- Corre este archivo en Supabase → SQL Editor del proyecto fabjsppgthpvbdfxsmch
-- Es idempotente: puedes correrlo varias veces sin duplicar datos (usa airtable_id).
-- =============================================

-- 1. GRUPOS (4)
INSERT INTO grupos (nombre, sede, airtable_id) VALUES
  ('GDC Faro',         'Sede 48',       'rec0PsjMfQlw8MDhx'),
  ('GDC Nueva Vida',   'Sede Cabudare', 'recG8WDpzKFIvEZnR'),
  ('GDC Roca Firme',   'Sede Este',     'recJuMhbCcEDzOtsc'),
  ('GDC Restauración', 'Sede Oeste',    'reclHIlgr8i697CoR')
ON CONFLICT (airtable_id) DO UPDATE
  SET nombre = EXCLUDED.nombre, sede = EXCLUDED.sede;

-- 2. MIEMBROS (8) — todos del GDC Faro
INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Henry Rivas', 'Padre Espiritual', g.id,
  '04245053420', 'henryrivas_902@gmail.com', '1993-11-06', 'Soltero',
  'Lcdo. Administracion de RRHH', '7 Años', 'Avenida Las Turas, Transversal 2, Urb Patarata', false,
  'Jeyson de la Rosa', '2017', null, 'Sabiduria, Disernimiento.', 'Liderazgo, Analisis, Comunicacion',
  ARRAY['C','S'], null, 7,
  ARRAY['Alpha / MADE','Discipulado','Bautizado','Retiro VEL','Padres','Fac. Grupos de A.','Consejería I','Consej. Juvenil','Persp. Bíblica','Nuevo Testamento'],
  ARRAY['Cómo controlar la ira'],
  'Sede Este', 'rec5A83uIFbx79AIl'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'David Yepez', 'Líder de Grupo', g.id,
  '04141577911', 'david.yepez.romero@gmail.com', '1987-08-18', 'Casado',
  'Ingeniero en Sistemas', '17 años', 'Carrera 15 entre 52 y 53', true,
  'Rene Garcia', null, null, 'Sabiduria, Disernimiento, Fe', 'Liderazgo, Consejeria',
  ARRAY['M','F'], 'Aaron Garcia', 8,
  ARRAY['Discipulado','Bautizado','Retiro VEL','Padres','2 Discipulados','Retiro Creciendo E/C','Retiro DARTE','Persp. Bíblica','Líder de Cuidado','Fund. Liderazgo','Pre-Matrimonial','Consej. Juvenil','Consejería I'],
  ARRAY['Cómo controlar la ira','Sanidad para el corazón herido','Sanando el vínculo materno','Noviazgo con propósito','Pre-matrimonial: nuevo comienzo'],
  'Sede Este', 'rec5mP8xWuA33GzJi'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Juan Colina', 'Padre Espiritual', g.id,
  '04245707580', 'musiccolina01@gmail.com', '2005-02-10', 'Soltero',
  'Gerente de Produccion MMD', '12', 'calle 57A con Av Pedro Leon Torres', true,
  'Jose Carta', null, null, 'Musica, Cuidado, Guia', null,
  ARRAY['F','S'], null, 7,
  ARRAY['Alpha / MADE','Discipulado','Bautizado','Retiro VEL','Padres','2 Discipulados','Retiro Creciendo E/C','Retiro DARTE','Persp. Bíblica','Líder de Cuidado'],
  ARRAY['Una vía de escape','Sanando el vínculo materno','Noviazgo con propósito'],
  'Sede Este', 'rec6a4OHZidFmqwqX'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Daniel Duran', 'Padre Espiritual', g.id,
  '04143789965', 'daniel27.dadne@gmail.com', '1998-12-16', 'Soltero',
  'Psicoterapeuta', '15 años', 'Adres Eloy Blanco', true,
  null, null, null, 'Disernimiento, Cuidado Pastoral', 'Creatividad, Analitico',
  ARRAY['M','F'], null, 8,
  ARRAY['Discipulado','Bautizado','Retiro VEL','Padres','2 Discipulados','Retiro Creciendo E/C','Retiro DARTE','Persp. Bíblica','Líder de Cuidado','Nuevo Testamento','Antiguo Testamento'],
  ARRAY['Cómo controlar la ira','Sanidad para el corazón herido'],
  'Sede Este', 'recO7nypUoJi92mE3'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Yexon Alvarez', 'Padre Espiritual', g.id,
  '04121124646', 'yexonalvarez589@gmail.com', '1997-11-10', 'Soltero',
  'Operador de Radio', '7 Años', 'Moyetones Sector 3', true,
  'Luis Moreno', null, null, null, null,
  ARRAY['M','C'], null, 3,
  ARRAY['Discipulado','Bautizado','Retiro VEL','Padres'],
  ARRAY[]::text[],
  'Sede Este', 'recP9VLTrYIHkeNQ3'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Luis Navarro', 'Padre Espiritual', g.id,
  '04120574923', 'navarromluisdavid@gmail.com', '1996-02-04', 'Soltero',
  'Misico Profesional', '3', 'Calle 54 con Carrera 23', true,
  null, null, null, 'Eseñanza', 'Musicales, Direccion',
  ARRAY['F','C'], 'Doiran Vizcaya', 3,
  ARRAY['Alpha / MADE','Discipulado','Bautizado','Retiro VEL','Padres'],
  ARRAY[]::text[],
  'Sede Este', 'recgimYDnNnBWd9Nz'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Gustavo Alvarado', 'Miembro', g.id,
  '04245211315', 'alvaradogustavo056@gmail.com', '1996-01-30', 'Soltero',
  'Abogado', '1 año y medio', null, true,
  'Daniel Porras', '2026', null, null, null,
  ARRAY['C','S'], null, 0,
  ARRAY[]::text[],
  ARRAY[]::text[],
  'Sede Este', 'recmF4CLY5q52wf9N'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

INSERT INTO miembros (
  nombre, rol, grupo_id,
  telefono, correo, fecha_nacimiento, estado_civil,
  profesion, tiempo_iglesia, direccion, bautizado,
  padre_esp, disc_inicio, disc_fin, dones, habilidades,
  temperamentos, mentor, nivel_idx,
  cursos_completados, apoyo_completados,
  sede, airtable_id
)
SELECT
  'Alejandro Azuaje', 'Padre Espiritual', g.id,
  '04122348175', 'aleazuajerivas@gmail.com', '1997-03-11', 'Soltero',
  'Administrador', '3', 'Las Clavellinas sector 02 Casa 7', true,
  'Daniel Porras', '11/03/2025', null, 'Lengua, Sabiduria, Disernimiento', 'Tecnologia, Redaccion',
  ARRAY['M','S'], 'Ebrexis Goyo', 7,
  ARRAY['Discipulado','Bautizado','Retiro VEL','Padres','Persp. Bíblica'],
  ARRAY[]::text[],
  'Sede Este', 'recyU5ROAxFG7loa7'
FROM grupos g WHERE g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

-- 3. EVENTOS (8)
INSERT INTO eventos (titulo, fecha, hora, lugar, tipo, airtable_id) VALUES
  ('Capacitación Líder de Cuidado', '2026-06-19', '5:00 PM',      'Salón 3',              'capacitacion', 'rec1O3OU24YYQmZw0'),
  ('Reunion de Liderez',            '2026-06-24', '4:00 PM',      'Panaderia Margarita',  'reunion',      'rec8EcCDXsZeItCx9'),
  ('Reunión de Líderes',            '2026-06-05', '7:00 PM',      'Templo principal',     'reunion',      'rec8WM4CYwoY8SENq'),
  ('Retiro DARTE',                  '2026-06-21', 'Todo el día',  'Campamento El Edén',   'retiro',       'recMjUQLnuynzAibk'),
  ('Reunion de Liderez',            '2026-07-03', '4:00 PM',      'Panaderia Margarita',  'reunion',      'recOYjLdbIazWaw9T'),
  ('Noche de Jóvenes Adultos',      '2026-06-12', '6:30 PM',      'Auditorio',            'evento',       'recTm3D5SHVPA8o3h'),
  ('Reunión Padres Espirituales',   '2026-06-27', '7:00 PM',      'Salón 1',              'reunion',      'recmqNYxuUV6m6eUW'),
  ('Servicio General',              '2026-06-13', '9:00 AM',      'Templo principal',     'servicio',     'recyXPbXoxN5jcHOM')
ON CONFLICT (airtable_id) DO NOTHING;

-- 4. SEGUIMIENTOS (1)
INSERT INTO seguimientos (
  miembro_id, miembro_nombre, grupo_id,
  fecha, hora, temas, proximos_pasos, estado, lider_nombre,
  airtable_id
)
SELECT
  m.id, 'Alejandro Azuaje', g.id,
  '2026-07-24', '6:00 pm', 'Vida Adulta',
  'Evaluación de independencia economica familiar',
  'Realizada', 'Davidypz',
  'recnBcKzuNR8YuiLp'
FROM miembros m, grupos g
WHERE m.airtable_id = 'recyU5ROAxFG7loa7' AND g.airtable_id = 'rec0PsjMfQlw8MDhx'
ON CONFLICT (airtable_id) DO NOTHING;

-- 5. CLASES (2)
INSERT INTO clases (titulo, pilar, orden, fecha, descripcion, airtable_id) VALUES
  ('Jesus mi amigo Fiel', 'Relación con Dios', 1, '2026-07-25', 'Confiar que Jesus es mi fiel amigo en todo momento', 'recJQeRR2v6tyPJ3p'),
  ('Jesus mi amigo Fiel', 'Relación con Dios', 1, '2026-07-25', null, 'recSqIeRuQbRtpu1N')
ON CONFLICT (airtable_id) DO NOTHING;

-- =============================================
-- VERIFICACIÓN: muestra cuántos registros quedaron
-- =============================================
SELECT 'grupos'       AS tabla, count(*) FROM grupos
UNION ALL SELECT 'miembros',      count(*) FROM miembros
UNION ALL SELECT 'eventos',       count(*) FROM eventos
UNION ALL SELECT 'seguimientos',  count(*) FROM seguimientos
UNION ALL SELECT 'clases',        count(*) FROM clases
ORDER BY tabla;
