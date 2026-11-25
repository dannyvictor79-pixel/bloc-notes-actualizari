create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists panels (
  id text primary key,
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('admin', 'friend')),
  invite_token text not null unique,
  system_prompt text not null default '',
  created_by_sub text not null,
  created_at timestamptz not null default now()
);

create table if not exists panel_members (
  panel_id text not null references panels(id) on delete cascade,
  member_sub text not null,
  member_email text not null default '',
  member_name text not null default '',
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (panel_id, member_sub)
);

create index if not exists panel_members_sub_idx on panel_members (member_sub);
create index if not exists panel_members_email_idx on panel_members (member_email);

create table if not exists messages (
  id text primary key,
  panel_id text not null references panels(id) on delete cascade,
  author_sub text not null default '',
  author_name text not null default '',
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_panel_created_idx on messages (panel_id, created_at);
