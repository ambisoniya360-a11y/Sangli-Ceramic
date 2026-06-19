-- Sangali Ceramica Extended Database Schema & Migration

-- Enable UUID extension if not already done
create extension if not exists "uuid-ossp";

-- 1. USERS & ROLES TABLE (Synchronized with Auth Users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('Super Admin', 'Admin', 'Staff')) default 'Staff',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to automatically insert user into public.users when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Staff Member'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Staff')
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PRODUCTS MULTI-IMAGE TABLE
create table if not exists public.product_images (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  image_url text not null,
  image_name text not null,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Alter products table to add status column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'status') then
    alter table public.products add column status text not null check (status in ('Draft', 'Published', 'Archived')) default 'Published';
  end if;
end $$;

-- 3. CRM INQUIRIES UPGRADES & NOTES
-- Alter inquiries table to support new fields if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inquiries' and column_name = 'page_url') then
    alter table public.inquiries add column page_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inquiries' and column_name = 'product_name') then
    alter table public.inquiries add column product_name text;
  end if;
end $$;

-- Create lead notes table
create table if not exists public.lead_notes (
  id uuid default uuid_generate_v4() primary key,
  inquiry_id uuid references public.inquiries(id) on delete cascade not null,
  note text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. HERO BANNER MANAGEMENT
create table if not exists public.hero_banners (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  heading text,
  subheading text,
  button_text text,
  button_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. WEBSITE SETTINGS & SEO
create table if not exists public.website_settings (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null default 'Sangali Ceramica',
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  social_links jsonb default '{}'::jsonb,
  seo_title text,
  seo_description text,
  seo_keywords text,
  seo_og_image text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert a default row of settings if empty
insert into public.website_settings (business_name)
select 'Sangali Ceramica'
where not exists (select 1 from public.website_settings);

-- 6. ACTIVITY LOGS
create table if not exists public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. ENABLE ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.product_images enable row level security;
alter table public.lead_notes enable row level security;
alter table public.hero_banners enable row level security;
alter table public.website_settings enable row level security;
alter table public.activity_logs enable row level security;

-- RLS Policies for new tables
-- Public read access
create policy "Allow public read access on users" on public.users for select using (true);
create policy "Allow public read access on product_images" on public.product_images for select using (true);
create policy "Allow public read access on hero_banners" on public.hero_banners for select using (true);
create policy "Allow public read access on website_settings" on public.website_settings for select using (true);

-- Admin write access (any authenticated user can write, but Super Admin handles users)
create policy "Allow admin full access on users" on public.users for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on product_images" on public.product_images for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on lead_notes" on public.lead_notes for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on hero_banners" on public.hero_banners for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on website_settings" on public.website_settings for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on activity_logs" on public.activity_logs for all using (auth.role() = 'authenticated');

-- 8. STORAGE BUCKETS SETUP
insert into storage.buckets (id, name, public) values 
  ('hero', 'hero', true),
  ('testimonials', 'testimonials', true),
  ('website-assets', 'website-assets', true)
on conflict (id) do nothing;

-- Storage RLS Policies
create policy "Public Access on hero" on storage.objects for select using (bucket_id = 'hero');
create policy "Public Access on testimonials" on storage.objects for select using (bucket_id = 'testimonials');
create policy "Public Access on website-assets" on storage.objects for select using (bucket_id = 'website-assets');

create policy "Admin Insert on hero" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'hero');
create policy "Admin Insert on testimonials" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'testimonials');
create policy "Admin Insert on website-assets" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'website-assets');

create policy "Admin Update/Delete on hero" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'hero');
create policy "Admin Update/Delete on testimonials" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'testimonials');
create policy "Admin Update/Delete on website-assets" on storage.objects for all using (auth.role() = 'authenticated' and bucket_id = 'website-assets');
