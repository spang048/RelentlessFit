-- RelentlessFit initial schema

-- User profiles (extends Supabase auth.users)
create table if not exists rf_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null default '',
  sex text not null default 'male' check (sex in ('male','female')),
  birth_date date not null default '1990-01-01',
  height_cm numeric(5,1) not null default 175,
  activity_level text not null default 'lightly_active'
    check (activity_level in ('sedentary','lightly_active','moderately_active','very_active')),
  goal_type text not null default 'maintain'
    check (goal_type in ('maintain','lose_slow','lose_moderate','gain_slow')),
  goal_weight_lb numeric(6,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Food entries
create table if not exists rf_food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name text not null,
  calories integer not null check (calories >= 0),
  quantity_text text,
  notes text
);

-- Exercise entries
create table if not exists rf_exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_at timestamptz not null default now(),
  exercise_type text not null check (exercise_type in ('run','walk','bike','strength','ski','hike','other')),
  duration_min integer not null check (duration_min > 0),
  calories_burned integer not null check (calories_burned >= 0),
  distance numeric(8,2),
  avg_hr integer,
  source text not null default 'manual' check (source in ('manual','garmin','scale','healthkit')),
  notes text,
  external_id text
);

-- Weight entries
create table if not exists rf_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_lb numeric(6,1) not null check (weight_lb > 0),
  body_fat_pct numeric(5,2),
  waist_in numeric(5,1),
  notes text,
  source text not null default 'manual' check (source in ('manual','garmin','scale','healthkit')),
  unique (user_id, date)
);

-- Indexes for common query patterns
create index if not exists rf_food_entries_user_date on rf_food_entries (user_id, logged_at);
create index if not exists rf_exercise_entries_user_date on rf_exercise_entries (user_id, logged_at);
create index if not exists rf_weight_entries_user_date on rf_weight_entries (user_id, date);

-- Row-level security
alter table rf_profiles enable row level security;
alter table rf_food_entries enable row level security;
alter table rf_exercise_entries enable row level security;
alter table rf_weight_entries enable row level security;

create policy "Users own their profile"
  on rf_profiles for all using (auth.uid() = user_id);

create policy "Users own their food entries"
  on rf_food_entries for all using (auth.uid() = user_id);

create policy "Users own their exercise entries"
  on rf_exercise_entries for all using (auth.uid() = user_id);

create policy "Users own their weight entries"
  on rf_weight_entries for all using (auth.uid() = user_id);

-- Auto-update updated_at on profiles
create or replace function rf_update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rf_profiles_updated_at
  before update on rf_profiles
  for each row execute procedure rf_update_updated_at();
