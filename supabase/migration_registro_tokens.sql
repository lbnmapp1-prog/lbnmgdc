-- Migración: Tokens de registro (enlaces grupales e individuales)
-- Ejecutar en Supabase SQL Editor

-- Añadir grupo_id a registros_pendientes si no existe
alter table registros_pendientes add column if not exists grupo_id uuid references grupos(id) on delete set null;

create table if not exists registro_tokens (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  tipo          text not null check (tipo in ('grupal','individual')),
  grupo_id      uuid references grupos(id) on delete cascade,
  grupo_nombre  text,
  expira_en     timestamptz,          -- grupal: cuándo expira
  nombre_persona text,                -- individual: nombre pre-cargado
  usado         boolean default false,-- individual: se marca al enviar
  activo        boolean default true,
  created_by    uuid references perfiles(id) on delete set null
);

alter table registro_tokens enable row level security;
create policy "tokens_read_auth"   on registro_tokens for select to authenticated using (true);
create policy "tokens_insert_auth" on registro_tokens for insert to authenticated with check (true);
create policy "tokens_update_auth" on registro_tokens for update to authenticated using (true);
create policy "tokens_delete_auth" on registro_tokens for delete to authenticated using (true);

-- RPC pública: valida el token y devuelve info para armar el formulario
create or replace function registro_token_info(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  tok registro_tokens%rowtype;
begin
  select * into tok from registro_tokens where id = p_token;

  if not found or not tok.activo then
    return jsonb_build_object('valido', false, 'error', 'Este enlace no es válido o fue desactivado.');
  end if;

  if tok.tipo = 'grupal' and tok.expira_en is not null and tok.expira_en < now() then
    return jsonb_build_object('valido', false, 'error', 'Este enlace ha expirado. Pídele a tu líder uno nuevo.');
  end if;

  if tok.tipo = 'individual' and tok.usado then
    return jsonb_build_object('valido', false, 'error', 'Este enlace ya fue utilizado.');
  end if;

  return jsonb_build_object(
    'valido',          true,
    'tipo',            tok.tipo,
    'grupo_nombre',    tok.grupo_nombre,
    'nombre_persona',  tok.nombre_persona,
    'expira_en',       tok.expira_en
  );
end;
$$;

-- RPC pública actualizada: acepta token, extrae grupo, valida y marca usado
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
    v_grupo_id   := tok.grupo_id;
    v_grupo      := tok.grupo_nombre;
    -- Individual: usar nombre pre-cargado si no viene en el form
    if tok.tipo = 'individual' and tok.nombre_persona is not null then
      v_nombre := tok.nombre_persona;
    end if;
  end if;

  -- Validar nombre (si no vino del token)
  if v_nombre is null then
    v_nombre := trim(left(coalesce(p_datos->>'nombre',''), 100));
  end if;
  if length(v_nombre) < 2 then raise exception 'El nombre es requerido.'; end if;
  if v_nombre !~ '^[A-Za-záéíóúÁÉÍÓÚüÜñÑ ''.\-]+$' then raise exception 'El nombre contiene caracteres no permitidos.'; end if;

  v_telefono := regexp_replace(coalesce(p_datos->>'telefono',''), '[^0-9+]', '', 'g');
  v_telefono := left(v_telefono, 20);
  if length(v_telefono) > 0 and length(v_telefono) < 7 then raise exception 'El teléfono debe tener al menos 7 dígitos.'; end if;

  v_correo := lower(trim(left(coalesce(p_datos->>'correo',''), 100)));
  if length(v_correo) > 0 and v_correo !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'El correo no tiene un formato válido.';
  end if;

  v_estado_civil := coalesce(p_datos->>'estado_civil','');
  if v_estado_civil <> '' and v_estado_civil not in ('Soltero/a','Casado/a','Divorciado/a','Viudo/a','Unión libre') then
    raise exception 'Estado civil inválido.';
  end if;

  begin
    if coalesce(p_datos->>'fecha_nacimiento','') <> '' then
      v_fecha := (p_datos->>'fecha_nacimiento')::date;
      if v_fecha > current_date - interval '10 years' or v_fecha < current_date - interval '100 years' then
        raise exception 'Fecha de nacimiento inválida.';
      end if;
    end if;
  exception when others then raise exception 'Fecha de nacimiento inválida.'; end;

  -- Grupo desde el form solo si no vino del token
  if v_grupo is null then
    v_grupo := left(trim(regexp_replace(coalesce(p_datos->>'grupo_nombre',''), '[<>"''\\]', '', 'g')), 100);
  end if;
  v_como := left(trim(regexp_replace(coalesce(p_datos->>'como_llego',''), '[<>"''\\]', '', 'g')), 300);

  if length(coalesce(v_telefono,'')) > 0 and
     (select count(*) from registros_pendientes where telefono = v_telefono and estado = 'Pendiente') >= 2 then
    raise exception 'Ya tienes una solicitud pendiente. Espera a que tu líder la revise.';
  end if;

  insert into registros_pendientes (nombre, telefono, correo, fecha_nacimiento, estado_civil, grupo_nombre, como_llego, grupo_id)
  values (v_nombre, nullif(v_telefono,''), nullif(v_correo,''), v_fecha,
          nullif(v_estado_civil,''), nullif(v_grupo,''), nullif(v_como,''), v_grupo_id);

  -- Marcar token individual como usado
  if p_token is not null and tok.tipo = 'individual' then
    update registro_tokens set usado = true where id = p_token;
  end if;
end;
$$;

revoke all on function registro_token_info(uuid) from public;
revoke all on function registro_publico_enviar(jsonb, uuid) from public;
-- Keep old signature working too
revoke all on function registro_publico_enviar(jsonb) from public;
grant execute on function registro_token_info(uuid) to anon, authenticated;
grant execute on function registro_publico_enviar(jsonb, uuid) to anon, authenticated;
grant execute on function registro_publico_enviar(jsonb) to anon, authenticated;
