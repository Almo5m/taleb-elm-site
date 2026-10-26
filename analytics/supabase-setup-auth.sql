-- =====================================================================
-- أمان لوحة الإحصائيات — طالب علم
-- شغّل الملف ده مرة واحدة في Supabase Dashboard → SQL Editor → Run
-- (بعد supabase-setup.sql و supabase-setup-reviews.sql و supabase-setup-verified-reviews.sql)
--
-- بيعمل إيه:
--  1) بيشيل دوال الباسورد القديمة نهائيًا (الباسورد كان بيتبعت من المتصفح).
--  2) بيعمل دوال جديدة مش بتشتغل غير لو اللي بينادي عليها مسجّل دخول
--     بحساب Supabase Auth وموجود في جدول الأدمن.
--  3) بيحط حدود على الإدخال (طول الحقول + حد أقصى للطلبات) عشان السبام.
--
-- الخطوات اليدوية قبل ما تشغّله (مرة واحدة):
--  أ) Authentication → Users → Add user: إيميلك + باسورد قوي، وفعّل Auto Confirm.
--  ب) Authentication → Sign In / Providers: اقفل "Allow new users to sign up".
--  ج) بعد ما تشغّل الملف ده، شغّل السطر الأخير (المعلّق) بإيميلك عشان تبقى أدمن.
-- =====================================================================

-- 1) جدول الأدمن: مفيش أي policy عليه، يعني محدش يقراه أو يعدّل فيه من بره
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admin_users enable row level security;
revoke all on admin_users from anon, authenticated;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- 2) شيل الدوال القديمة اللي كانت بتاخد باسورد
drop function if exists get_site_stats(text);
drop function if exists get_site_stats_daily(text, int);
drop function if exists admin_list_reviews(text);
drop function if exists admin_review_action(text, bigint, text);

-- 3) الدوال الجديدة: الأدمن بس
create or replace function get_site_stats()
returns table (
  total_page_views bigint, unique_visitors bigint,
  total_reached_download bigint, unique_reached_download bigint,
  total_downloaded bigint, unique_downloaded bigint,
  total_whatsapp_followed bigint, unique_whatsapp_followed bigint,
  reached_but_not_downloaded bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'unauthorized'; end if;
  return query
  select
    (select count(*) from site_events where event_type = 'page_view'),
    (select count(distinct visitor_id) from site_events where event_type = 'page_view'),
    (select count(*) from site_events where event_type = 'reached_download'),
    (select count(distinct visitor_id) from site_events where event_type = 'reached_download'),
    (select count(*) from site_events where event_type = 'download_clicked'),
    (select count(distinct visitor_id) from site_events where event_type = 'download_clicked'),
    (select count(*) from site_events where event_type = 'whatsapp_followed'),
    (select count(distinct visitor_id) from site_events where event_type = 'whatsapp_followed'),
    (select count(distinct visitor_id) from site_events
       where event_type = 'reached_download'
       and visitor_id not in (select visitor_id from site_events where event_type = 'download_clicked'));
end;
$$;

create or replace function get_site_stats_daily(p_days int default 14)
returns table (day date, page_views bigint, reached_download bigint, downloaded bigint, whatsapp_followed bigint)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'unauthorized'; end if;
  return query
  select d::date,
    count(*) filter (where e.event_type = 'page_view'),
    count(*) filter (where e.event_type = 'reached_download'),
    count(*) filter (where e.event_type = 'download_clicked'),
    count(*) filter (where e.event_type = 'whatsapp_followed')
  from generate_series(current_date - (least(greatest(p_days,1),365) - 1) * interval '1 day', current_date, interval '1 day') d
  left join site_events e on e.created_at::date = d::date
  group by d order by d asc;
end;
$$;

create or replace function admin_list_reviews()
returns setof site_reviews
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'unauthorized'; end if;
  return query select * from site_reviews order by created_at desc;
end;
$$;

create or replace function admin_review_action(p_id bigint, p_action text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not is_admin() then raise exception 'unauthorized'; end if;
  if p_action = 'approve' then update site_reviews set approved = true where id = p_id;
  elsif p_action = 'delete' then delete from site_reviews where id = p_id;
  else raise exception 'invalid action';
  end if;
end;
$$;

revoke all on function get_site_stats() from public, anon;
revoke all on function get_site_stats_daily(int) from public, anon;
revoke all on function admin_list_reviews() from public, anon;
revoke all on function admin_review_action(bigint, text) from public, anon;
grant execute on function get_site_stats() to authenticated;
grant execute on function get_site_stats_daily(int) to authenticated;
grant execute on function admin_list_reviews() to authenticated;
grant execute on function admin_review_action(bigint, text) to authenticated;

-- 4) حدود على الإدخال في site_events: طول الحقول + حد أقصى للطلبات
create or replace function guard_site_event()
returns trigger
language plpgsql set search_path = public, pg_temp
as $$
begin
  if char_length(new.visitor_id) not between 8 and 64 then raise exception 'invalid visitor'; end if;
  new.page       := left(new.page, 200);
  new.referrer   := left(new.referrer, 500);
  new.user_agent := left(new.user_agent, 300);
  -- نفس الزائر: 30 حدث في الدقيقة بالكتير
  if (select count(*) from site_events where visitor_id = new.visitor_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate limit';
  end if;
  -- الموقع كله: 600 حدث في الدقيقة بالكتير (يمنع إغراق الجدول)
  if (select count(*) from site_events where created_at > now() - interval '1 minute') >= 600 then
    raise exception 'rate limit';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_site_event on site_events;
create trigger trg_guard_site_event before insert on site_events
  for each row execute function guard_site_event();

-- 5) حد أقصى للتقييمات الجديدة: 30 في الساعة للموقع كله
create or replace function guard_review_rate()
returns trigger
language plpgsql set search_path = public, pg_temp
as $$
begin
  if (select count(*) from site_reviews where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limit';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_review_rate on site_reviews;
create trigger trg_guard_review_rate before insert on site_reviews
  for each row execute function guard_review_rate();

-- 6) آخر خطوة: خلّي حسابك أدمن (شيل علامة -- واكتب إيميلك بين العلامتين)
-- insert into admin_users (user_id) select id from auth.users where email = 'اكتب_إيميلك_هنا' on conflict do nothing;
