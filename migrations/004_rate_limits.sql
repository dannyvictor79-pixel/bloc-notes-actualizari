create table if not exists rate_limits (
  bucket_key text primary key,
  hit_count integer not null default 0,
  reset_at timestamptz not null
);
