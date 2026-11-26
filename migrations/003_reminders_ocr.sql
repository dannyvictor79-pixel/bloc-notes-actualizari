create table if not exists panel_settings (
  panel_id text primary key references panels(id) on delete cascade,
  remind_3_days boolean not null default true,
  remind_6_days boolean not null default false,
  morning_summary boolean not null default false,
  morning_hour integer not null default 9,
  timezone text not null default 'Europe/Berlin',
  last_remind_3_on date,
  last_remind_6_on date,
  last_morning_on date,
  updated_at timestamptz not null default now()
);

create table if not exists reminder_log (
  id text primary key,
  panel_id text not null references panels(id) on delete cascade,
  kind text not null,
  expiration_id text,
  sent_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists reminder_log_panel_day_idx
  on reminder_log (panel_id, sent_on, kind);
