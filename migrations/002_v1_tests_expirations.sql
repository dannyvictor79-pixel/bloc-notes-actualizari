alter table panels add column api_key text;

update panels set api_key = invite_token where api_key is null or api_key = '';

create unique index if not exists panels_api_key_uidx on panels (api_key);

create table if not exists expirations (
  id text primary key,
  panel_id text not null references panels(id) on delete cascade,
  client_name text not null,
  app_name text not null default '',
  mac_address text not null default '',
  expires_at timestamptz not null,
  source text not null default 'manual',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists expirations_panel_expires_idx
  on expirations (panel_id, expires_at);

create table if not exists test_jobs (
  id text primary key,
  panel_id text not null references panels(id) on delete cascade,
  status text not null check (status in ('primit', 'in_lucru', 'efectuat', 'esuat')),
  app_name text not null default '',
  mac_address text not null default '',
  client_name text not null default '',
  duration_hours integer not null default 24,
  raw_input text not null default '',
  result_note text not null default '',
  created_by_sub text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists test_jobs_panel_created_idx
  on test_jobs (panel_id, created_at desc);
