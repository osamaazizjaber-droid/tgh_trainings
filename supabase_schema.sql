-- ================================================================
-- QR-Based Training Management System — Supabase Schema
-- Run this entire file in: Supabase > SQL Editor > New Query
-- ================================================================

create extension if not exists "pgcrypto";

-- ================================================================
-- 1. PROJECTS
-- ================================================================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- ================================================================
-- 2. ACTIVITIES
-- ================================================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- ================================================================
-- 2.5 TRAINERS (Custom Auth Table)
-- ================================================================
create table if not exists trainers (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  full_name text not null,
  created_at timestamptz default now()
);

-- ================================================================
-- 3. TRAININGS
-- ================================================================
create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade not null,
  trainer_id uuid references trainers(id) on delete set null,
  title text not null,
  days_count int default 1 check (days_count between 1 and 10),
  has_pre_test boolean default false,
  has_post_test boolean default false,
  has_evaluation boolean default true,
  qr_expires_at timestamptz,
  created_at timestamptz default now()
);

-- ================================================================
-- 4. USERS (Attendees) — 4-part name + village + representation + function
-- ================================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  first_name  text not null,
  second_name text not null,
  third_name  text,
  fourth_name text,
  phone text unique not null,
  gender text check (gender in ('male', 'female')),
  dob date,
  age int check (age > 0 and age < 120),
  governorate text,
  district text,
  subdistrict text,
  village text,
  representation text,
  job_function text,
  created_at timestamptz default now()
);

-- ================================================================
-- 5. ATTENDANCE
-- ================================================================
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  training_id uuid references trainings(id) on delete cascade not null,
  day_number int not null check (day_number between 1 and 10),
  date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, training_id, day_number)
);

-- ================================================================
-- 6. QUESTIONS
-- ================================================================
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references trainings(id) on delete cascade not null,
  type text not null check (type in ('pre', 'post')),
  question_text text not null,
  question_type text not null check (question_type in ('mcq', 'text')) default 'mcq',
  points int default 1 check (points > 0),
  order_num int default 0,
  created_at timestamptz default now()
);

-- ================================================================
-- 7. CHOICES (MCQ Options)
-- ================================================================
create table if not exists choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade not null,
  choice_text text not null,
  is_correct boolean default false,
  created_at timestamptz default now()
);

-- ================================================================
-- 8. ANSWERS
-- ================================================================
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  choice_id uuid references choices(id),
  answer_text text,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

-- ================================================================
-- 9. EVALUATIONS
-- ================================================================
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  training_id uuid references trainings(id) on delete cascade not null,
  responses jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(user_id, training_id)
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
alter table projects enable row level security;
alter table activities enable row level security;
alter table trainers enable row level security;
alter table trainings enable row level security;
alter table users enable row level security;
alter table attendance enable row level security;
alter table questions enable row level security;
alter table choices enable row level security;
alter table answers enable row level security;
alter table evaluations enable row level security;

-- Public read trainings (QR validation)
create policy "Public read trainings" on trainings for select using (true);

-- Questions & Choices: public read
create policy "Public read questions" on questions for select using (true);
create policy "Public read choices" on choices for select using (true);

-- Users: public insert + read (registration & phone lookup)
create policy "Public insert users" on users for insert with check (true);
create policy "Public read users" on users for select using (true);

-- Attendance: public insert + read
create policy "Public insert attendance" on attendance for insert with check (true);
create policy "Public read attendance" on attendance for select using (true);

-- Answers: public insert + read
create policy "Public insert answers" on answers for insert with check (true);
create policy "Public read answers" on answers for select using (true);

-- Evaluations: public insert + read
create policy "Public insert evaluations" on evaluations for insert with check (true);
create policy "Public read evaluations" on evaluations for select using (true);

-- Admin-only write policies
create policy "Auth manage projects" on projects for all using (auth.role() = 'authenticated');
create policy "Public read projects" on projects for select using (true);

create policy "Auth manage activities" on activities for all using (auth.role() = 'authenticated');
create policy "Public read activities" on activities for select using (true);

create policy "Auth manage trainers" on trainers for all using (auth.role() = 'authenticated');
create policy "Public read trainers" on trainers for select using (true); -- Only used to read usernames/names if needed, passwords handled by RPC

create policy "Auth manage questions" on questions for all using (auth.role() = 'authenticated');
create policy "Auth manage choices" on choices for all using (auth.role() = 'authenticated');
create policy "Auth manage trainings" on trainings for all using (auth.role() = 'authenticated');

-- ================================================================
-- RPC FUNCTIONS
-- ================================================================
create or replace function login_trainer(p_username text, p_password text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_trainer_id uuid;
begin
  select id into v_trainer_id from trainers where username = p_username and password = p_password;
  return v_trainer_id;
end;
$$;

-- ================================================================
-- VIEWS
-- ================================================================

-- Attendance summary per day
create or replace view attendance_summary as
select
  t.id as training_id,
  t.title as training_title,
  a.day_number,
  count(a.id) as attendee_count
from trainings t
left join attendance a on a.training_id = t.id
group by t.id, t.title, a.day_number
order by t.id, a.day_number;

-- Pre vs Post score comparison
create or replace view test_score_comparison as
select
  u.id as user_id,
  concat_ws(' ', u.first_name, u.second_name, u.third_name, u.fourth_name) as user_name,
  u.phone,
  t.id as training_id,
  t.title as training_title,
  coalesce(sum(case when q.type = 'pre' and c.is_correct = true then q.points else 0 end), 0) as pre_score,
  coalesce(sum(case when q.type = 'pre' then q.points else 0 end), 0) as pre_max,
  coalesce(sum(case when q.type = 'post' and c.is_correct = true then q.points else 0 end), 0) as post_score,
  coalesce(sum(case when q.type = 'post' then q.points else 0 end), 0) as post_max
from users u
join answers ans on ans.user_id = u.id
join questions q on q.id = ans.question_id
join trainings t on t.id = q.training_id
left join choices c on c.id = ans.choice_id
group by u.id, u.first_name, u.second_name, u.third_name, u.fourth_name, u.phone, t.id, t.title;
