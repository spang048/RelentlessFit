-- Saved meals for quick logging
create table if not exists rf_meals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  items          jsonb not null default '[]',
  total_calories integer not null default 0,
  created_at     timestamptz not null default now()
);

alter table rf_meals enable row level security;

drop policy if exists "Users own their meals" on rf_meals;
create policy "Users own their meals"
  on rf_meals for all
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
