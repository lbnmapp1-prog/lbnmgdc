-- Migración: Registro público de inscripción
-- Ejecutar en Supabase SQL Editor

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
  estado        text not null default 'Pendiente',
  notas_lider   text
);

alter table registros_pendientes enable row level security;

drop policy if exists "registros_read_auth"   on registros_pendientes;
drop policy if exists "registros_update_auth" on registros_pendientes;
drop policy if exists "registros_delete_auth" on registros_pendientes;

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
  v_como         text;
begin
  v_nombre := trim(left(coalesce(p_datos->>'nombre',''), 100));
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

  v_grupo := left(trim(regexp_replace(coalesce(p_datos->>'grupo_nombre',''), '[<>"''\\]', '', 'g')), 100);
  v_como  := left(trim(regexp_replace(coalesce(p_datos->>'como_llego',''),   '[<>"''\\]', '', 'g')), 300);

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
