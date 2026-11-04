-- Migración: Ampliar registros_pendientes con todos los campos del formulario de miembro
-- Ejecutar en Supabase SQL Editor

alter table registros_pendientes
  add column if not exists profesion       text,
  add column if not exists ocupacion       text,
  add column if not exists tiempo_iglesia  text,
  add column if not exists nro_hijos       int,
  add column if not exists edades_hijos    text,
  add column if not exists aniversario     text,
  add column if not exists direccion       text,
  add column if not exists sede            text,
  add column if not exists padre_esp       text,
  add column if not exists disc_inicio     text,
  add column if not exists disc_fin        text,
  add column if not exists bautizado       boolean,
  add column if not exists dones           text,
  add column if not exists habilidades     text,
  add column if not exists temperamentos   text[],
  add column if not exists mentor          text,
  add column if not exists oracion         text,
  add column if not exists nivel_idx       int,
  add column if not exists cursos_completados text[],
  add column if not exists apoyo_completados  text[];

-- RPC actualizada con todos los campos
create or replace function registro_publico_enviar(p_datos jsonb, p_token uuid default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_nombre       text;
  v_telefono     text;
  v_correo       text;
  v_fecha        date;
  v_estado_civil text;
  v_grupo        text;
  v_como         text;
  v_grupo_id     uuid;
  tok            registro_tokens%rowtype;
begin
  -- Validar token si se proporcionó
  if p_token is not null then
    select * into tok from registro_tokens where id = p_token;
    if not found or not tok.activo then
      raise exception 'Enlace no válido o desactivado.';
    end if;
    if tok.tipo = 'grupal' and tok.expira_en is not null and tok.expira_en < now() then
      raise exception 'Este enlace ha expirado.';
    end if;
    if tok.tipo = 'individual' and tok.usado then
      raise exception 'Este enlace ya fue utilizado.';
    end if;
    v_grupo_id := tok.grupo_id;
    v_grupo    := tok.grupo_nombre;
    if tok.tipo = 'individual' and tok.nombre_persona is not null then
      v_nombre := tok.nombre_persona;
    end if;
  end if;

  -- Nombre
  if v_nombre is null then
    v_nombre := trim(left(coalesce(p_datos->>'nombre',''), 100));
  end if;
  if length(v_nombre) < 2 then raise exception 'El nombre es requerido.'; end if;
  if v_nombre !~ '^[A-Za-záéíóúÁÉÍÓÚüÜñÑ ''.\-]+$' then raise exception 'El nombre contiene caracteres no permitidos.'; end if;

  -- Teléfono
  v_telefono := regexp_replace(coalesce(p_datos->>'telefono',''), '[^0-9+]', '', 'g');
  v_telefono := left(v_telefono, 20);
  if length(v_telefono) > 0 and length(v_telefono) < 7 then raise exception 'El teléfono debe tener al menos 7 dígitos.'; end if;

  -- Correo
  v_correo := lower(trim(left(coalesce(p_datos->>'correo',''), 100)));
  if length(v_correo) > 0 and v_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'El correo no tiene un formato válido.';
  end if;

  -- Estado civil
  v_estado_civil := coalesce(p_datos->>'estado_civil','');
  if v_estado_civil <> '' and v_estado_civil not in ('Soltero/a','Casado/a','Divorciado/a','Viudo/a','Unión libre') then
    raise exception 'Estado civil inválido.';
  end if;

  -- Fecha nacimiento
  begin
    if coalesce(p_datos->>'fecha_nacimiento','') <> '' then
      v_fecha := (p_datos->>'fecha_nacimiento')::date;
      if v_fecha > current_date - interval '10 years' or v_fecha < current_date - interval '100 years' then
        raise exception 'Fecha de nacimiento inválida.';
      end if;
    end if;
  exception when others then raise exception 'Fecha de nacimiento inválida.'; end;

  -- Grupo
  if v_grupo is null then
    v_grupo := left(trim(regexp_replace(coalesce(p_datos->>'grupo_nombre',''), '[<>"''\\]', '', 'g')), 100);
  end if;
  v_como := left(trim(regexp_replace(coalesce(p_datos->>'como_llego',''), '[<>"''\\]', '', 'g')), 300);

  -- Anti-spam
  if length(coalesce(v_telefono,'')) > 0 and
     (select count(*) from registros_pendientes where telefono = v_telefono and estado = 'Pendiente') >= 2 then
    raise exception 'Ya tienes una solicitud pendiente. Espera a que tu líder la revise.';
  end if;

  -- Validar sede
  if coalesce(p_datos->>'sede','') <> '' and (p_datos->>'sede') not in
     ('Sede Este','Sede Oeste','Sede Cabudare','Sede 48','Sede 52') then
    raise exception 'Sede inválida.';
  end if;

  -- Validar nro_hijos
  if coalesce(p_datos->>'nro_hijos','') <> '' then
    if (p_datos->>'nro_hijos')::int < 0 or (p_datos->>'nro_hijos')::int > 30 then
      raise exception 'Número de hijos inválido.';
    end if;
  end if;

  insert into registros_pendientes (
    nombre, telefono, correo, fecha_nacimiento, estado_civil, grupo_nombre, como_llego, grupo_id,
    profesion, ocupacion, tiempo_iglesia, nro_hijos, edades_hijos, aniversario, direccion,
    sede, padre_esp, disc_inicio, disc_fin, bautizado,
    dones, habilidades, temperamentos, mentor, oracion,
    nivel_idx, cursos_completados, apoyo_completados
  ) values (
    v_nombre,
    nullif(v_telefono,''),
    nullif(v_correo,''),
    v_fecha,
    nullif(v_estado_civil,''),
    nullif(v_grupo,''),
    nullif(v_como,''),
    v_grupo_id,
    nullif(trim(left(coalesce(p_datos->>'profesion',''),100)),''),
    nullif(trim(left(coalesce(p_datos->>'ocupacion',''),100)),''),
    nullif(trim(left(coalesce(p_datos->>'tiempo_iglesia',''),50)),''),
    case when coalesce(p_datos->>'nro_hijos','') <> '' then (p_datos->>'nro_hijos')::int else null end,
    nullif(trim(left(coalesce(p_datos->>'edades_hijos',''),100)),''),
    nullif(trim(left(coalesce(p_datos->>'aniversario',''),20)),''),
    nullif(trim(left(coalesce(p_datos->>'direccion',''),200)),''),
    nullif(coalesce(p_datos->>'sede',''),''),
    nullif(trim(left(coalesce(p_datos->>'padre_esp',''),100)),''),
    nullif(trim(left(coalesce(p_datos->>'disc_inicio',''),20)),''),
    nullif(trim(left(coalesce(p_datos->>'disc_fin',''),20)),''),
    case when coalesce(p_datos->>'bautizado','') <> '' then (p_datos->>'bautizado')::boolean else null end,
    nullif(trim(left(coalesce(p_datos->>'dones',''),200)),''),
    nullif(trim(left(coalesce(p_datos->>'habilidades',''),200)),''),
    case when jsonb_typeof(p_datos->'temperamentos') = 'array' then
      array(select jsonb_array_elements_text(p_datos->'temperamentos')) else null end,
    nullif(trim(left(coalesce(p_datos->>'mentor',''),100)),''),
    nullif(trim(left(coalesce(p_datos->>'oracion',''),500)),''),
    case when coalesce(p_datos->>'nivel_idx','') <> '' then (p_datos->>'nivel_idx')::int else null end,
    case when jsonb_typeof(p_datos->'cursos_completados') = 'array' then
      array(select jsonb_array_elements_text(p_datos->'cursos_completados')) else null end,
    case when jsonb_typeof(p_datos->'apoyo_completados') = 'array' then
      array(select jsonb_array_elements_text(p_datos->'apoyo_completados')) else null end
  );

  -- Marcar token individual como usado
  if p_token is not null and tok.tipo = 'individual' then
    update registro_tokens set usado = true where id = p_token;
  end if;
end;
$$;

revoke all on function registro_publico_enviar(jsonb, uuid) from public;
revoke all on function registro_publico_enviar(jsonb) from public;
grant execute on function registro_publico_enviar(jsonb, uuid) to anon, authenticated;
grant execute on function registro_publico_enviar(jsonb) to anon, authenticated;
