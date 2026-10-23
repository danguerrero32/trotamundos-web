-- Los Trotamundos · esquema de la base de datos (23 de octubre de 2026)
-- Se pega en el editor SQL de Supabase. Idempotente: se puede ejecutar varias veces.
-- Fuente: docs/diseno-funcional.md §10 y docs/planes/2026-10-23-backend-panel.md (Tarea 3).
--
-- Regla de acceso: ninguna tabla es legible desde el navegador. RLS activado en todas
-- y SIN políticas: solo entra el servidor de la web (clave secreta) y el panel a través de él.
-- La única puerta abierta a la clave pública es la función latir(), que solo apunta un latido.

create extension if not exists pgcrypto;

create or replace function marca_actualizado() returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

-- ---------- Carta ----------
create table if not exists categorias (
  id             text primary key,                 -- el identificador de la pestaña de la web (deaqui, carnes…)
  nombre         jsonb not null,                   -- {es, …}: el panel solo escribe es
  orden          smallint not null default 0,
  visible        boolean not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists platos (
  id             uuid primary key default gen_random_uuid(),
  categoria_id   text not null references categorias(id) on update cascade on delete restrict,
  nombre         jsonb not null,                   -- {es, …}: el panel solo escribe es
  descripcion    jsonb not null default '{}',
  nota_precio    jsonb not null default '{}',      -- "(confirmar)", "por unidad"…
  precio         numeric(8,2),                     -- null = sin precio (Entrecote)
  emoji          text not null default '',
  visible        boolean not null default true,    -- "hoy no hay"
  archivado      boolean not null default false,   -- "quitar de la carta", recuperable
  orden          smallint not null default 0,
  -- Con lastapp_id, el precio lo manda LastApp. Sin él, el plato va a mano y nadie le toca el precio.
  lastapp_id     text unique,                      -- un producto de LastApp, como mucho un plato
  lastapp_nombre text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists platos_categoria_orden on platos(categoria_id, orden);

create table if not exists productos_lastapp (
  id             text primary key,                 -- Id del producto en la organización
  nombre         text not null,
  precio         numeric(8,2),
  categoria      text,
  descripcion    text,
  no_web         boolean not null default false,   -- "no va en la web": se recuerda en cada importación
  primera_vez    timestamptz not null default now(),
  ultima_vez     timestamptz not null default now()
);

create table if not exists importaciones (
  id             uuid primary key default gen_random_uuid(),
  en             timestamptz not null default now(),
  quien          text,
  archivo        text,
  formato        text check (formato in ('productos', 'catalogo')),
  catalogo       text,
  filas          jsonb not null default '[]',
  vista          jsonb,
  decisiones     jsonb,
  resumen        jsonb,
  estado         text not null default 'vista_previa' check (estado in ('vista_previa', 'aplicada', 'descartada')),
  aplicada_en    timestamptz
);
create index if not exists importaciones_aplicadas on importaciones(aplicada_en desc) where estado = 'aplicada';

-- ---------- Actividades y consultas ----------
create table if not exists actividades (
  id             text primary key,                 -- senderismo, caballo, 4x4…
  emoji          text not null default '',
  nombre         jsonb not null,
  descripcion    jsonb not null default '{}',
  foto           text,
  encuadre       text not null default 'centro' check (encuadre in ('arriba', 'centro', 'abajo')),
  visible        boolean not null default true,
  archivada      boolean not null default false,
  orden          smallint not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists consultas (
  id               uuid primary key default gen_random_uuid(),
  recibida_en      timestamptz not null default now(),
  actividad_id     text references actividades(id) on update cascade on delete set null,
  actividad_nombre text,                           -- el nombre en español cuando llegó
  nombre           text not null,
  telefono         text not null,
  fecha            date,
  personas         text,
  idioma           text not null default 'es' check (idioma in ('es', 'en', 'fr', 'ca')),
  acepta_privacidad_en timestamptz not null,
  estado           text not null default 'nueva' check (estado in ('nueva', 'contestada', 'confirmada', 'descartada')),
  notas            text,
  aviso_enviado    boolean not null default false,
  anonimizada_en   timestamptz,
  actualizado_en   timestamptz not null default now()
);
create index if not exists consultas_estado_recibida on consultas(estado, recibida_en desc);
create index if not exists consultas_telefono_recibida on consultas(telefono, recibida_en);

-- ---------- Ajustes del panel (clave → valor) ----------
create table if not exists ajustes (
  clave          text primary key,
  valor          jsonb not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por text
);
-- Los correos de aviso arrancan vacíos: se dan de alta desde Ajustes o con SQL local, nunca en el repositorio.
insert into ajustes (clave, valor) values
  ('whatsapp', '"+34858893777"'),
  ('correos_aviso', '[]'),
  ('aviso_consultas_correo', 'true'),
  ('nombre_gestor', '"Daniel"')
on conflict (clave) do nothing;

-- ---------- Panel: acceso, sesiones e historial ----------
create table if not exists administradores (
  email          text primary key,
  nombre         text,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

create table if not exists sesiones_panel (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text not null unique,               -- nunca se guarda el token en claro
  email       text not null,
  tipo        text not null check (tipo in ('enlace', 'sesion')),
  creado_en   timestamptz not null default now(),
  caduca_en   timestamptz not null,
  usado_en    timestamptz,                         -- enlaces: un solo uso
  ultimo_uso  timestamptz,                         -- sesiones: para renovar los 90 días
  agente      text
);
create index if not exists sesiones_panel_email on sesiones_panel(email);

create table if not exists historial (
  id             bigint generated always as identity primary key,
  en             timestamptz not null default now(),
  quien          text,                             -- correo de quien entró, o 'web' / 'tarea'
  accion         text not null,
  tabla          text,
  registro_id    text,
  detalle        jsonb
);
create index if not exists historial_en on historial(en desc);

-- ---------- Latido (para que el plan gratuito no se pause) ----------
create table if not exists latidos (
  en             timestamptz primary key default clock_timestamp(),
  origen         text not null check (origen in ('vercel', 'github'))
);

create or replace function latir(p_origen text) returns void
language sql security definer set search_path = public as $$
  insert into latidos (origen) values (p_origen);
$$;
revoke all on function latir(text) from public;
grant execute on function latir(text) to anon, authenticated, service_role;

-- ---------- Disparadores de "actualizado_en" ----------
do $$ declare t text; begin
  foreach t in array array['categorias', 'platos', 'actividades', 'consultas'] loop
    execute format('drop trigger if exists %I on %I', t || '_actualizado', t);
    execute format('create trigger %I before update on %I for each row execute function marca_actualizado()', t || '_actualizado', t);
  end loop;
end $$;

-- ---------- RLS: todo cerrado al público ----------
do $$ declare t text; begin
  foreach t in array array['categorias', 'platos', 'productos_lastapp', 'importaciones', 'actividades', 'consultas',
                           'ajustes', 'administradores', 'sesiones_panel', 'historial', 'latidos'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------- Almacén de fotos (actividades) ----------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;
