-- ════════════════════════════════════════════════════════════════════
-- Community: members coached by the same coach can see each other's
-- shared meals (+ like/comment them), workout progress and profiles.
-- Only meals with share_with_coach = true ("shared") are visible.
-- (RLS only — no table changes, so schema.prisma is unaffected.)
-- ════════════════════════════════════════════════════════════════════

-- True when the caller and p_other are both active members of the same coach.
create or replace function public.same_community(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_other <> auth.uid() and exists (
    select 1
    from coach_links mine
    join coach_links theirs on theirs.coach_id = mine.coach_id
    where mine.member_id = auth.uid() and mine.status = 'active'
      and theirs.member_id = p_other and theirs.status = 'active'
  );
$$;

-- Profiles: also visible to community peers.
create or replace function public.knows_profile(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_links
    where status in ('pending', 'active', 'ended')
      and ((coach_id = auth.uid() and member_id = p_other)
        or (member_id = auth.uid() and coach_id = p_other))
  ) or public.same_community(p_other);
$$;

-- Meals: shared posts are visible to the coach and community peers.
create or replace function public.can_view_meal(p_meal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from meals m
    where m.id = p_meal
      and (m.user_id = auth.uid()
        or (m.share_with_coach and (public.is_coach_of(m.user_id) or public.same_community(m.user_id))))
  );
$$;

drop policy if exists "meals: read" on public.meals;
create policy "meals: read" on public.meals for select using (
  user_id = auth.uid()
  or (share_with_coach and (public.is_coach_of(user_id) or public.same_community(user_id)))
);

-- Workout progress: read-only for community peers.
drop policy if exists "plans: community read" on public.workout_plans;
create policy "plans: community read" on public.workout_plans for select
  using (public.same_community(member_id));

drop policy if exists "items: community read" on public.workout_items;
create policy "items: community read" on public.workout_items for select using (
  exists (select 1 from public.workout_plans p where p.id = plan_id and public.same_community(p.member_id))
);

-- Roster of the caller's community (all active members of their coach, incl. self).
create or replace function public.community_members()
returns table (id uuid, full_name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url
  from coach_links mine
  join coach_links l on l.coach_id = mine.coach_id and l.status = 'active'
  join profiles p on p.id = l.member_id
  where mine.member_id = auth.uid() and mine.status = 'active'
  order by p.full_name;
$$;
