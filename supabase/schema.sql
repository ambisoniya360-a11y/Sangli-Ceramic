-- Sangali Ceramica Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BRANDS
create table public.brands (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  logo text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRODUCTS
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  price numeric,
  category_id uuid references public.categories(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  featured boolean default false,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- GALLERY
create table public.gallery (
  id uuid default uuid_generate_v4() primary key,
  image text not null,
  title text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INQUIRIES
create table public.inquiries (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  mobile text not null,
  email text,
  message text,
  status text default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TESTIMONIALS
create table public.testimonials (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  review text not null,
  rating integer check (rating >= 1 and rating <= 5),
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.gallery enable row level security;
alter table public.inquiries enable row level security;
alter table public.testimonials enable row level security;

-- Create basic RLS policies for read access (public)
create policy "Allow public read access on categories" on public.categories for select using (true);
create policy "Allow public read access on brands" on public.brands for select using (true);
create policy "Allow public read access on products" on public.products for select using (true);
create policy "Allow public read access on gallery" on public.gallery for select using (true);
create policy "Allow public read access on testimonials" on public.testimonials for select using (true);

-- Allow public inserts for inquiries
create policy "Allow public insert on inquiries" on public.inquiries for insert with check (true);

-- Admin full access policy (assuming authenticated users are admins)
create policy "Allow admin full access on categories" on public.categories for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on brands" on public.brands for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on products" on public.products for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on gallery" on public.gallery for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on inquiries" on public.inquiries for all using (auth.role() = 'authenticated');
create policy "Allow admin full access on testimonials" on public.testimonials for all using (auth.role() = 'authenticated');

-- Create storage buckets
insert into storage.buckets (id, name, public) values 
  ('products', 'products', true),
  ('brands', 'brands', true),
  ('gallery', 'gallery', true),
  ('categories', 'categories', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Public Access" on storage.objects for select using (bucket_id in ('products', 'brands', 'gallery', 'categories'));
create policy "Admin Insert" on storage.objects for insert with check (auth.role() = 'authenticated');
create policy "Admin Update" on storage.objects for update using (auth.role() = 'authenticated');
create policy "Admin Delete" on storage.objects for delete using (auth.role() = 'authenticated');
