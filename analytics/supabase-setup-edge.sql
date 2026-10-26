-- =====================================================================
-- قفل الكتابة المباشرة — طالب علم
-- شغّل الملف ده بعد supabase-setup-auth.sql، وبعد ما تنشر الدالتين
-- (track و review) — خطوات النشر في README.
--
-- بيعمل إيه:
--  1) جدول وعدّاد بسيط لحدود الطلبات (rate limit) بتستخدمه الدالتين.
--  2) بيقفل إدخال مفتاح anon في site_events: الكتابة بقت من الدالة بس.
--  3) دالة حفظ التقييم الجديدة بتاخد "موثّق" من السيرفر، ومتاحة
--     لصلاحية السيرفر فقط. القديمة (اللي كانت بتصدّق العميل) بتتمسح.
-- =====================================================================

-- 1) عدّاد الطلبات: مفيش أي policy، يعني محدش يوصله من بره
create table if not exists rate_hits (
  key          text        not null,
  window_start timestamptz not null,
  hits         int         not null default 0,
  primary key (key, window_start)
);
alter table rate_hits enable row level security;
revoke all on rate_hits from anon, authenticated;

create or replace function hit_rate(p_key text, p_seconds int, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_seconds) * p_seconds);
  v_hits  int;
begin
  insert into rate_hits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = rate_hits.hits + 1
  returning hits into v_hits;

  if random() < 0.01 then  -- تنضيف تلقائي للسجلات القديمة
    delete from rate_hits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;
revoke all on function hit_rate(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate(text, int, int) to service_role;

-- 2) الأحداث: الكتابة من الدالة بس
drop policy if exists "allow insert from anyone" on site_events;
revoke insert on site_events from anon;

-- 3) التقييمات: "موثّق" بتيجي من الدالة بعد التحقق من الإثبات الموقّع
drop function if exists submit_review(text, int, text, text);

create or replace function submit_review_verified(
  p_name text, p_rating int, p_comment text, p_visitor_id text, p_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_name is null or char_length(trim(p_name)) not between 1 and 60 then raise exception 'invalid name'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'invalid rating'; end if;
  if p_comment is not null and char_length(p_comment) > 500 then raise exception 'comment too long'; end if;
  if p_visitor_id is null or char_length(p_visitor_id) not between 8 and 64 then raise exception 'invalid visitor'; end if;

  insert into site_reviews (name, rating, comment, visitor_id, verified)
  values (trim(p_name), p_rating, nullif(trim(coalesce(p_comment, '')), ''), p_visitor_id, coalesce(p_verified, false))
  on conflict (visitor_id) where visitor_id is not null
  do update set
    name = excluded.name,
    rating = excluded.rating,
    comment = excluded.comment,
    verified = site_reviews.verified or excluded.verified,
    approved = false,  -- أي تعديل بيرجع يستنى مراجعة
    created_at = now();
end;
$$;
revoke all on function submit_review_verified(text, int, text, text, boolean) from public, anon, authenticated;
grant execute on function submit_review_verified(text, int, text, text, boolean) to service_role;
