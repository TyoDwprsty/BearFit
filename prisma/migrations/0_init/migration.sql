-- ════════════════════════════════════════════════════════════════════
-- BearFit — initial schema
-- Applied by `prisma migrate deploy` (baseline). Hand-written SQL: RLS, RPCs, triggers.
-- gen_random_uuid() is built into Postgres 13+, no extension needed.
-- ════════════════════════════════════════════════════════════════════


-- ─── Enums ───────────────────────────────────────────────────────────
create type public.app_role as enum ('member', 'coach');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.portion_size as enum ('small', 'medium', 'large');
create type public.exercise_category as enum ('cardio', 'strength', 'flexibility');
create type public.intensity_level as enum ('light', 'medium', 'hard');
create type public.link_status as enum ('pending', 'active', 'rejected', 'ended');
create type public.reminder_kind as enum ('workout', 'water', 'meal', 'stretch', 'recap', 'custom');

-- ─── Profiles ────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default '',
  avatar_url text,
  is_member boolean not null default false,
  is_coach boolean not null default false,
  active_role public.app_role,
  onboarded boolean not null default false,
  locale text not null default 'id' check (locale in ('id', 'en')),
  timezone text not null default 'Asia/Jakarta',
  coach_code text unique,
  coach_bio text,
  height_cm numeric(5, 1),
  alarm_vibrate boolean not null default true,
  alarm_snooze_min int not null default 10 check (alarm_snooze_min between 1 and 60),
  alarm_tone text not null default 'beru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.targets (
  user_id uuid primary key references public.profiles on delete cascade,
  kcal int not null default 2000,
  protein_g int not null default 90,
  carbs_g int not null default 250,
  fat_g int not null default 65,
  workout_min int not null default 40,
  water_glasses int not null default 8,
  meals int not null default 4,
  target_weight_kg numeric(5, 1),
  updated_by uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now()
);

-- ─── Coach ↔ member links ────────────────────────────────────────────
create table public.coach_links (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles on delete cascade,
  member_id uuid not null references public.profiles on delete cascade,
  status public.link_status not null default 'pending',
  initiated_by public.app_role not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (coach_id <> member_id)
);
create unique index coach_links_one_active on public.coach_links (member_id) where status = 'active';
create unique index coach_links_one_pending on public.coach_links (coach_id, member_id) where status = 'pending';
create index coach_links_coach on public.coach_links (coach_id, status);

-- ─── Exercises & plans ───────────────────────────────────────────────
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name_id text not null,
  name_en text not null,
  category public.exercise_category not null,
  intensity public.intensity_level not null default 'light',
  sets int check (sets > 0),
  reps int check (reps > 0),
  duration_sec int check (duration_sec > 0),
  minutes int not null default 10 check (minutes > 0),
  created_by uuid references public.profiles on delete cascade, -- null = built-in
  created_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles on delete cascade,
  plan_date date not null,
  source text not null default 'member' check (source in ('member', 'coach', 'program')),
  note text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, plan_date)
);

create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans on delete cascade,
  exercise_id uuid references public.exercises on delete set null,
  name_id text not null,
  name_en text not null,
  category public.exercise_category not null,
  intensity public.intensity_level not null default 'light',
  sets int,
  reps int,
  duration_sec int,
  minutes int not null default 10,
  position int not null default 0,
  done_at timestamptz,
  added_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index workout_items_plan on public.workout_items (plan_id);
create index workout_items_done on public.workout_items (done_at) where done_at is not null;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles on delete cascade,
  name text not null,
  description text,
  weeks int not null default 8 check (weeks between 1 and 52),
  created_at timestamptz not null default now()
);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  exercise_id uuid not null references public.exercises on delete cascade,
  position int not null default 0
);
create index program_items_program on public.program_items (program_id, day_of_week);

create table public.member_programs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles on delete cascade,
  program_id uuid not null references public.programs on delete cascade,
  coach_id uuid not null references public.profiles on delete cascade,
  start_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index member_programs_one_active on public.member_programs (member_id) where active;

-- ─── Food, water, weight ─────────────────────────────────────────────
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  meal_type public.meal_type not null,
  eaten_at timestamptz not null default now(),
  caption text not null default '',
  portion public.portion_size not null default 'medium',
  tags text[] not null default '{}',
  photo_key text,
  photo_url text,
  calories int check (calories >= 0),
  protein_g numeric(6, 1) check (protein_g >= 0),
  carbs_g numeric(6, 1) check (carbs_g >= 0),
  fat_g numeric(6, 1) check (fat_g >= 0),
  ai_estimated boolean not null default false,
  share_with_coach boolean not null default true,
  created_at timestamptz not null default now()
);
create index meals_user_time on public.meals (user_id, eaten_at desc);

create table public.meal_comments (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index meal_comments_meal on public.meal_comments (meal_id, created_at);

create table public.meal_likes (
  meal_id uuid not null references public.meals on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);

create table public.water_logs (
  user_id uuid not null references public.profiles on delete cascade,
  log_date date not null,
  glasses int not null default 0 check (glasses between 0 and 30),
  primary key (user_id, log_date)
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  log_date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ─── Reminders & push ────────────────────────────────────────────────
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind public.reminder_kind not null default 'custom',
  label text not null,
  remind_time time not null,
  days smallint[] not null default '{0,1,2,3,4,5,6}', -- 0 = Sunday
  repeat_every_min int check (repeat_every_min between 15 and 720),
  repeat_until time,
  enabled boolean not null default true,
  snooze_until timestamptz,
  last_fired_at timestamptz,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index reminders_enabled on public.reminders (enabled) where enabled;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─── Chat & notifications ────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_pair on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_recipient_unread on public.messages (recipient_id) where read_at is null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  actor_id uuid references public.profiles on delete set null,
  kind text not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════
-- Helper functions (security definer so they can be used inside RLS)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.is_coach_of(p_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_links
    where coach_id = auth.uid() and member_id = p_member and status = 'active'
  );
$$;

create or replace function public.can_manage_member(p_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_member = auth.uid() or public.is_coach_of(p_member);
$$;

create or replace function public.are_linked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_links
    where status = 'active'
      and ((coach_id = a and member_id = b) or (coach_id = b and member_id = a))
  );
$$;

create or replace function public.knows_profile(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_links
    where status in ('pending', 'active', 'ended')
      and ((coach_id = auth.uid() and member_id = p_other)
        or (member_id = auth.uid() and coach_id = p_other))
  );
$$;

create or replace function public.can_view_meal(p_meal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from meals m
    where m.id = p_meal
      and (m.user_id = auth.uid() or (m.share_with_coach and public.is_coach_of(m.user_id)))
  );
$$;

create or replace function public.gen_coach_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where coach_code = code);
  end loop;
  return code;
end;
$$;

-- ─── Triggers ────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  insert into public.targets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.is_coach and new.coach_code is null then
    new.coach_code := public.gen_coach_code();
  end if;
  if new.active_role = 'coach' and not new.is_coach then
    new.active_role := case when new.is_member then 'member'::public.app_role else null end;
  end if;
  if new.active_role = 'member' and not new.is_member then
    new.active_role := case when new.is_coach then 'coach'::public.app_role else null end;
  end if;
  return new;
end;
$$;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.coach_links enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_items enable row level security;
alter table public.programs enable row level security;
alter table public.program_items enable row level security;
alter table public.member_programs enable row level security;
alter table public.meals enable row level security;
alter table public.meal_comments enable row level security;
alter table public.meal_likes enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles: read self or linked" on public.profiles for select
  using (id = auth.uid() or public.knows_profile(id));
create policy "profiles: update self" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- targets (member or their coach)
create policy "targets: read" on public.targets for select using (public.can_manage_member(user_id));
create policy "targets: write" on public.targets for update
  using (public.can_manage_member(user_id)) with check (public.can_manage_member(user_id));
create policy "targets: insert self" on public.targets for insert with check (user_id = auth.uid());

-- coach_links (mutations go through RPCs below)
create policy "links: read own" on public.coach_links for select
  using (coach_id = auth.uid() or member_id = auth.uid());

-- exercises
create policy "exercises: read" on public.exercises for select using (
  created_by is null
  or created_by = auth.uid()
  or exists (
    select 1 from public.coach_links l
    where l.coach_id = exercises.created_by and l.member_id = auth.uid() and l.status = 'active'
  )
);
create policy "exercises: coach insert" on public.exercises for insert with check (
  created_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_coach)
);
create policy "exercises: coach update" on public.exercises for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "exercises: coach delete" on public.exercises for delete using (created_by = auth.uid());

-- workout plans & items
create policy "plans: all" on public.workout_plans for all
  using (public.can_manage_member(member_id)) with check (public.can_manage_member(member_id));
create policy "items: all" on public.workout_items for all
  using (exists (select 1 from public.workout_plans p where p.id = plan_id and public.can_manage_member(p.member_id)))
  with check (exists (select 1 from public.workout_plans p where p.id = plan_id and public.can_manage_member(p.member_id)));

-- programs
create policy "programs: coach all" on public.programs for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "programs: member read" on public.programs for select using (
  exists (select 1 from public.member_programs mp where mp.program_id = programs.id and mp.member_id = auth.uid())
);
create policy "program_items: coach all" on public.program_items for all
  using (exists (select 1 from public.programs p where p.id = program_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.programs p where p.id = program_id and p.coach_id = auth.uid()));
create policy "program_items: member read" on public.program_items for select using (
  exists (select 1 from public.member_programs mp where mp.program_id = program_items.program_id and mp.member_id = auth.uid())
);
create policy "member_programs: read" on public.member_programs for select
  using (member_id = auth.uid() or coach_id = auth.uid());
create policy "member_programs: coach write" on public.member_programs for all
  using (coach_id = auth.uid() and public.is_coach_of(member_id))
  with check (coach_id = auth.uid() and public.is_coach_of(member_id));

-- meals
create policy "meals: read" on public.meals for select
  using (user_id = auth.uid() or (share_with_coach and public.is_coach_of(user_id)));
create policy "meals: insert self" on public.meals for insert with check (user_id = auth.uid());
create policy "meals: update self" on public.meals for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meals: delete self" on public.meals for delete using (user_id = auth.uid());

create policy "comments: read" on public.meal_comments for select using (public.can_view_meal(meal_id));
create policy "comments: insert" on public.meal_comments for insert
  with check (author_id = auth.uid() and public.can_view_meal(meal_id));
create policy "comments: delete own" on public.meal_comments for delete using (author_id = auth.uid());

create policy "likes: read" on public.meal_likes for select using (public.can_view_meal(meal_id));
create policy "likes: insert" on public.meal_likes for insert
  with check (user_id = auth.uid() and public.can_view_meal(meal_id));
create policy "likes: delete own" on public.meal_likes for delete using (user_id = auth.uid());

-- water & weight
create policy "water: read" on public.water_logs for select using (public.can_manage_member(user_id));
create policy "water: write self" on public.water_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "weight: read" on public.weight_logs for select using (public.can_manage_member(user_id));
create policy "weight: write self" on public.weight_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reminders (member or their coach)
create policy "reminders: all" on public.reminders for all
  using (public.can_manage_member(user_id)) with check (public.can_manage_member(user_id));

-- push subscriptions
create policy "push: self" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages
create policy "messages: read own" on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages: send to linked" on public.messages for insert
  with check (sender_id = auth.uid() and public.are_linked(sender_id, recipient_id));
create policy "messages: mark read" on public.messages for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- notifications (inserted by the service role)
create policy "notifications: self read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: self update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: self delete" on public.notifications for delete using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- RPCs for coach linking
-- ════════════════════════════════════════════════════════════════════

-- Member joins a coach instantly using the coach's invite code.
create or replace function public.join_coach_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_coach uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_member) then
    raise exception 'not_member';
  end if;
  select id into v_coach from profiles where coach_code = upper(trim(p_code)) and is_coach;
  if v_coach is null then raise exception 'invalid_code'; end if;
  if v_coach = auth.uid() then raise exception 'self_link'; end if;

  update coach_links set status = 'ended', responded_at = now()
    where member_id = auth.uid() and status = 'active' and coach_id <> v_coach;
  update coach_links set status = 'rejected', responded_at = now()
    where member_id = auth.uid() and coach_id = v_coach and status = 'pending';

  if not exists (select 1 from coach_links where member_id = auth.uid() and coach_id = v_coach and status = 'active') then
    insert into coach_links (coach_id, member_id, status, initiated_by, responded_at)
    values (v_coach, auth.uid(), 'active', 'member', now());
  end if;
  return v_coach;
end;
$$;

-- Member sends a request to a coach found by search.
create or replace function public.request_coach(p_coach uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_member) then
    raise exception 'not_member';
  end if;
  if not exists (select 1 from profiles where id = p_coach and is_coach) then
    raise exception 'not_coach';
  end if;
  if p_coach = auth.uid() then raise exception 'self_link'; end if;
  select id into v_id from coach_links
    where coach_id = p_coach and member_id = auth.uid() and status in ('pending', 'active');
  if v_id is not null then return v_id; end if;
  insert into coach_links (coach_id, member_id, status, initiated_by)
    values (p_coach, auth.uid(), 'pending', 'member') returning id into v_id;
  return v_id;
end;
$$;

-- Coach accepts or rejects a pending request.
create or replace function public.respond_link(p_link uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_member uuid;
begin
  select member_id into v_member from coach_links
    where id = p_link and coach_id = auth.uid() and status = 'pending';
  if v_member is null then raise exception 'not_found'; end if;
  if p_accept then
    update coach_links set status = 'ended', responded_at = now()
      where member_id = v_member and status = 'active';
    update coach_links set status = 'active', responded_at = now() where id = p_link;
  else
    update coach_links set status = 'rejected', responded_at = now() where id = p_link;
  end if;
end;
$$;

-- Either side ends an active link (or member cancels a pending request).
create or replace function public.end_link(p_link uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update coach_links set status = 'ended', responded_at = now()
    where id = p_link and status in ('active', 'pending')
      and (coach_id = auth.uid() or member_id = auth.uid());
  update member_programs set active = false
    where active and exists (
      select 1 from coach_links l where l.id = p_link
        and l.member_id = member_programs.member_id and l.coach_id = member_programs.coach_id
    );
end;
$$;

-- Coach discovery. Matches name, or exact email, or exact code.
create or replace function public.search_coaches(p_query text)
returns table (id uuid, full_name text, avatar_url text, coach_bio text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.coach_bio
  from profiles p
  where p.is_coach and p.id <> auth.uid() and length(trim(p_query)) >= 2
    and (p.full_name ilike '%' || trim(p_query) || '%'
      or lower(p.email) = lower(trim(p_query))
      or p.coach_code = upper(trim(p_query)))
  order by p.full_name
  limit 20;
$$;

-- Public coach card for /join/[code]
create or replace function public.coach_by_code(p_code text)
returns table (id uuid, full_name text, avatar_url text, coach_bio text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.coach_bio
  from profiles p where p.is_coach and p.coach_code = upper(trim(p_code));
$$;

-- Functions are executable by PUBLIC by default; restrict the RPCs explicitly.
revoke execute on function public.join_coach_by_code(text) from public, anon;
revoke execute on function public.request_coach(uuid) from public, anon;
revoke execute on function public.respond_link(uuid, boolean) from public, anon;
revoke execute on function public.end_link(uuid) from public, anon;
revoke execute on function public.search_coaches(text) from public, anon;
grant execute on function public.join_coach_by_code(text) to authenticated;
grant execute on function public.request_coach(uuid) to authenticated;
grant execute on function public.respond_link(uuid, boolean) to authenticated;
grant execute on function public.end_link(uuid) to authenticated;
grant execute on function public.search_coaches(text) to authenticated;
grant execute on function public.coach_by_code(text) to anon, authenticated;

-- ─── Realtime for chat ───────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;

-- ════════════════════════════════════════════════════════════════════
-- Seed: built-in exercise catalog
-- ════════════════════════════════════════════════════════════════════
insert into public.exercises (slug, name_id, name_en, category, intensity, sets, reps, duration_sec, minutes) values
  ('brisk-walk',      'Jalan cepat',      'Brisk walk',        'cardio',      'light',  null, null, null, 30),
  ('jumping-jack',    'Jumping jack',     'Jumping jacks',     'cardio',      'medium', 3,    null, 30,   5),
  ('light-jog',       'Jogging ringan',   'Light jog',         'cardio',      'medium', null, null, null, 20),
  ('jump-rope',       'Lompat tali',      'Jump rope',         'cardio',      'hard',   5,    null, 60,   10),
  ('cycling',         'Bersepeda santai', 'Easy cycling',      'cardio',      'light',  null, null, null, 30),
  ('squat',           'Squat',            'Squat',             'strength',    'medium', 3,    12,   null, 8),
  ('knee-pushup',     'Push-up lutut',    'Knee push-up',      'strength',    'light',  3,    10,   null, 6),
  ('plank',           'Plank',            'Plank',             'strength',    'medium', 3,    null, 30,   5),
  ('lunge',           'Lunge',            'Lunge',             'strength',    'medium', 3,    10,   null, 8),
  ('glute-bridge',    'Glute bridge',     'Glute bridge',      'strength',    'light',  3,    15,   null, 6),
  ('morning-stretch', 'Peregangan pagi',  'Morning stretch',   'flexibility', 'light',  null, null, null, 10),
  ('easy-yoga',       'Yoga santai',      'Easy yoga',         'flexibility', 'light',  null, null, null, 20),
  ('cooldown',        'Pendinginan',      'Cool-down stretch', 'flexibility', 'light',  null, null, null, 5);

-- ─── Backfill: users who signed in before this migration ran ──────────
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

insert into public.targets (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;
