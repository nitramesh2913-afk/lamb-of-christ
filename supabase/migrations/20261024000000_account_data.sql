create or replace function public.valid_account_snapshot(p_data jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  record_value jsonb;
  passage_value jsonb;
  prayer_id text;
  linked_id text;
  item_count bigint;
  distinct_count bigint;
begin
  if jsonb_typeof(p_data) is distinct from 'object'
    or p_data ->> 'version' is distinct from '1'
    or jsonb_typeof(p_data -> 'entries') is distinct from 'array'
    or jsonb_typeof(p_data -> 'prayers') is distinct from 'array'
    or jsonb_typeof(p_data -> 'deletedEntries') is distinct from 'array'
    or jsonb_typeof(p_data -> 'deletedPrayers') is distinct from 'array'
    or jsonb_typeof(p_data -> 'progress') is distinct from 'object'
    or jsonb_typeof(p_data -> 'progressVersions') is distinct from 'object'
    or jsonb_typeof(p_data #> '{progress,completed}') is distinct from 'object'
    or jsonb_typeof(p_data #> '{progress,answers}') is distinct from 'object'
    or p_data #>> '{progress,level}' is null
    or p_data #>> '{progress,level}' not in ('beginner', 'intermediate', 'indepth')
  then
    return false;
  end if;

  for record_value in select value from jsonb_each(p_data #> '{progress,completed}')
  loop
    if jsonb_typeof(record_value) is distinct from 'boolean' then return false; end if;
  end loop;
  for record_value in select value from jsonb_each(p_data #> '{progress,answers}')
  loop
    if jsonb_typeof(record_value) is distinct from 'array' then return false; end if;
    for passage_value in select value from jsonb_array_elements(record_value)
    loop
      if jsonb_typeof(passage_value) is distinct from 'string' then return false; end if;
    end loop;
  end loop;
  for record_value in select value from jsonb_each(p_data -> 'progressVersions')
  loop
    if jsonb_typeof(record_value) is distinct from 'string' then return false; end if;
  end loop;

  for record_value in select value from jsonb_array_elements(p_data -> 'entries')
  loop
    if jsonb_typeof(record_value) is distinct from 'object'
      or coalesce(record_value ->> 'id', '') = ''
      or length(record_value ->> 'id') > 200
      or coalesce(record_value ->> 'createdAt', '') = ''
      or coalesce(record_value ->> 'updatedAt', '') = ''
      or record_value ->> 'source' is null
      or record_value ->> 'source' not in ('lesson', 'free', 'prayer')
      or jsonb_typeof(record_value -> 'guided') is distinct from 'object'
      or jsonb_typeof(record_value -> 'lessonReflections') is distinct from 'array'
      or jsonb_typeof(record_value -> 'tags') is distinct from 'array'
      or jsonb_typeof(record_value -> 'reviews') is distinct from 'array'
      or jsonb_typeof(record_value -> 'notes') is distinct from 'string'
    then
      return false;
    end if;
  end loop;
  select count(*), count(distinct value ->> 'id')
    into item_count, distinct_count
    from jsonb_array_elements(p_data -> 'entries');
  if item_count <> distinct_count then return false; end if;

  for record_value in select value from jsonb_array_elements(p_data -> 'prayers')
  loop
    if jsonb_typeof(record_value) is distinct from 'object'
      or coalesce(record_value ->> 'id', '') = ''
      or length(record_value ->> 'id') > 200
      or coalesce(record_value ->> 'createdAt', '') = ''
      or coalesce(record_value ->> 'updatedAt', '') = ''
      or jsonb_typeof(record_value -> 'scripture') is distinct from 'array'
      or jsonb_typeof(record_value -> 'situation') is distinct from 'string'
      or jsonb_typeof(record_value -> 'text') is distinct from 'string'
      or record_value ->> 'language' is null
      or record_value ->> 'language' not in ('en', 'ta', 'tanglish')
      or record_value ->> 'length' is null
      or record_value ->> 'length' not in ('concise', 'detailed')
      or record_value ->> 'origin' is null
      or record_value ->> 'origin' not in ('ai', 'edited', 'written')
    then
      return false;
    end if;
    for passage_value in select value from jsonb_array_elements(record_value -> 'scripture')
    loop
      if jsonb_typeof(passage_value) is distinct from 'object'
        or coalesce(passage_value ->> 'id', '') = ''
        or coalesce(passage_value ->> 'ref', '') = ''
        or jsonb_typeof(passage_value -> 'quote') is distinct from 'string'
      then
        return false;
      end if;
    end loop;
  end loop;
  select count(*), count(distinct value ->> 'id')
    into item_count, distinct_count
    from jsonb_array_elements(p_data -> 'prayers');
  if item_count <> distinct_count then return false; end if;

  for record_value in
    select value from jsonb_array_elements(p_data -> 'deletedEntries')
      union all
    select value from jsonb_array_elements(p_data -> 'deletedPrayers')
  loop
    if jsonb_typeof(record_value) is distinct from 'object'
      or coalesce(record_value ->> 'id', '') = ''
      or length(record_value ->> 'id') > 200
      or coalesce(record_value ->> 'deletedAt', '') = ''
    then
      return false;
    end if;
  end loop;

  for record_value in select value from jsonb_array_elements(p_data -> 'prayers')
  loop
    linked_id := record_value ->> 'journalEntryId';
    if linked_id is not null and not exists (
      select 1 from jsonb_array_elements(p_data -> 'entries') as entries(value)
      where entries.value ->> 'id' = linked_id
        and entries.value ->> 'prayerId' = record_value ->> 'id'
    ) then
      return false;
    end if;
  end loop;
  for record_value in select value from jsonb_array_elements(p_data -> 'entries')
  loop
    prayer_id := record_value ->> 'prayerId';
    if prayer_id is not null and not exists (
      select 1 from jsonb_array_elements(p_data -> 'prayers') as prayers(value)
      where prayers.value ->> 'id' = prayer_id
        and prayers.value ->> 'journalEntryId' = record_value ->> 'id'
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.account_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_data_shape check (public.valid_account_snapshot(data))
);

alter table public.account_data enable row level security;
alter table public.account_data force row level security;

create policy "Users can read their own account data"
  on public.account_data for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own account data"
  on public.account_data for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own account data"
  on public.account_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own account data"
  on public.account_data for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.sync_account_data(p_data jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_revision bigint;
  current_data jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_expected_revision < 0 or not public.valid_account_snapshot(p_data) then
    raise exception 'Invalid account data' using errcode = '22023';
  end if;

  insert into public.account_data (user_id, revision, data)
  values (
    current_user_id,
    0,
    '{"version":1,"entries":[],"prayers":[],"progress":{"completed":{},"answers":{},"level":"beginner"},"progressUpdatedAt":null,"progressVersions":{},"deletedEntries":[],"deletedPrayers":[]}'::jsonb
  )
  on conflict (user_id) do nothing;

  select revision, data into current_revision, current_data
    from public.account_data
    where user_id = current_user_id
    for update;

  if current_revision <> p_expected_revision then
    return jsonb_build_object('ok', false, 'revision', current_revision, 'data', current_data);
  end if;

  update public.account_data
    set data = p_data, revision = current_revision + 1, updated_at = now()
    where user_id = current_user_id
    returning revision, data into current_revision, current_data;
  return jsonb_build_object('ok', true, 'revision', current_revision, 'data', current_data);
end;
$$;

revoke all on function public.valid_account_snapshot(jsonb) from public, anon;
revoke all on function public.sync_account_data(jsonb, bigint) from public, anon;
grant execute on function public.valid_account_snapshot(jsonb) to authenticated;
grant execute on function public.sync_account_data(jsonb, bigint) to authenticated;
grant select, insert, update, delete on public.account_data to authenticated;
