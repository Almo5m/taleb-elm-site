-- =====================================================================
-- توثيق التقييمات — طالب علم
-- شغّل الملف ده مرة واحدة في Supabase Dashboard → SQL Editor → Run
-- (بعد ما تكون شغّلت analytics/supabase-setup.sql و
--  analytics/supabase-setup-reviews.sql الأول)
--
-- الفكرة: بدل ما أي حد يكتب اسم وتقييم عادي بدون أي تأكيد، دلوقتي أي
-- تقييم بيتبعت بيتربط بنفس "معرّف الزائر" اللي بيستخدمه التطبيق أصلاً
-- في تتبّع الزوار (site_events). لو المعرّف ده سبق ودوّس زرار التحميل
-- فعليًا، التقييم بياخد شارة "✅ اتأكدنا إنه حمّل التطبيق" في الموقع.
-- مفيش أي بيانات شخصية إضافية بتتجمع — نفس المعرّف العشوائي المجهول
-- المستخدم أصلًا في الإحصائيات.
-- =====================================================================

-- 1) أعمدة جديدة لربط التقييم بالزائر ومعرفة هل هو "موثّق" ولا لأ
alter table site_reviews add column if not exists visitor_id text;
alter table site_reviews add column if not exists verified boolean not null default false;

-- تقييم واحد بس لكل زائر (لو بعت تاني، بيحدّث نفس تقييمه القديم بدل
-- ما يضيف واحد جديد جنبه) — بيمنع تكرار/سبام من نفس الشخص
create unique index if not exists site_reviews_visitor_unique
  on site_reviews (visitor_id) where visitor_id is not null;

-- 2) دالة الإرسال الوحيدة المسموح بيها — بتتأكد هل الزائر ده حمّل
--    التطبيق قبل كده (من جدول site_events) وتسجّل التقييم بالتبعية
create or replace function submit_review(
  p_name text,
  p_rating int,
  p_comment text,
  p_visitor_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verified boolean := false;
begin
  if p_name is null or char_length(trim(p_name)) = 0 or char_length(p_name) > 60 then
    raise exception 'invalid name';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'invalid rating';
  end if;
  if p_comment is not null and char_length(p_comment) > 500 then
    raise exception 'comment too long';
  end if;

  if p_visitor_id is not null then
    select exists(
      select 1 from site_events
      where visitor_id = p_visitor_id and event_type = 'download_clicked'
    ) into v_verified;
  end if;

  insert into site_reviews (name, rating, comment, visitor_id, verified)
  values (trim(p_name), p_rating, nullif(trim(coalesce(p_comment,'')),''), p_visitor_id, v_verified)
  on conflict (visitor_id) where visitor_id is not null
  do update set
    name = excluded.name,
    rating = excluded.rating,
    comment = excluded.comment,
    verified = excluded.verified,
    approved = false, -- أي تعديل على تقييم قديم بيرجع يستنى مراجعة تاني
    created_at = now();
end;
$$;

grant execute on function submit_review(text, int, text, text) to anon;

-- 3) قفل باب الإدخال المباشر للجدول — من دلوقتي كل التقييمات لازم تعدي
--    من خلال submit_review بس (عشان نضمن إن كل تقييم ليه visitor_id
--    ومحسوب verified صح، مش داخل من REST مباشرة بأي بيانات)
drop policy if exists "anyone can submit a review" on site_reviews;

-- السماح لمفتاح anon يعمل select على العمود verified (كان أصلًا مسموح
-- select للمعتمدين، بس بنتأكد إنه هنا لو الـ policy القديمة كانت
-- بتحدد أعمدة بعينها)
drop policy if exists "anyone can read approved reviews" on site_reviews;
create policy "anyone can read approved reviews"
  on site_reviews for select
  to anon
  using (approved = true);
