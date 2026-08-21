create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '기타',
  area text not null default '',
  address text not null default '',
  memo text not null default '',
  tags text[] not null default '{}',
  image_path text,
  image_paths text[] not null default '{}',
  image_source_url text,
  image_credit text,
  image_candidates text[] not null default '{}',
  naver_url text not null,
  latitude double precision,
  longitude double precision,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists image_source_url text;

alter table public.restaurants
  add column if not exists image_paths text[] not null default '{}';

alter table public.restaurants
  add column if not exists image_credit text;

alter table public.restaurants
  add column if not exists image_candidates text[] not null default '{}';

create index if not exists restaurants_visible_order_idx
  on public.restaurants (is_visible, sort_order, created_at desc);

alter table public.admin_users enable row level security;
alter table public.restaurants enable row level security;

drop policy if exists "admins can read their admin row" on public.admin_users;
create policy "admins can read their admin row"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "public can read visible restaurants" on public.restaurants;
create policy "public can read visible restaurants"
  on public.restaurants for select to anon, authenticated
  using (is_visible = true);

drop policy if exists "admins can read all restaurants" on public.restaurants;
create policy "admins can read all restaurants"
  on public.restaurants for select to authenticated
  using (exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ));

drop policy if exists "admins can insert restaurants" on public.restaurants;
create policy "admins can insert restaurants"
  on public.restaurants for insert to authenticated
  with check (exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ));

drop policy if exists "admins can update restaurants" on public.restaurants;
create policy "admins can update restaurants"
  on public.restaurants for update to authenticated
  using (exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ));

drop policy if exists "admins can delete restaurants" on public.restaurants;
create policy "admins can delete restaurants"
  on public.restaurants for delete to authenticated
  using (exists (
    select 1 from public.admin_users
    where admin_users.user_id = auth.uid()
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-images',
  'restaurant-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view restaurant images" on storage.objects;
create policy "public can view restaurant images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'restaurant-images');

drop policy if exists "admins can upload restaurant images" on storage.objects;
create policy "admins can upload restaurant images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

drop policy if exists "admins can update restaurant images" on storage.objects;
create policy "admins can update restaurant images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

drop policy if exists "admins can delete restaurant images" on storage.objects;
create policy "admins can delete restaurant images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'restaurant-images'
    and exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

-- Supabase Auth에서 관리자 계정을 만든 뒤 해당 UUID를 넣어 주세요.
-- insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000000');
