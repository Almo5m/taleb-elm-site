-- =====================================================================
-- تحليلات اللوحة: الدولة + مصادر الزيارات + الأجهزة + ساعات الذروة — طالب علم
-- شغّل الملف ده مرة واحدة في Supabase Dashboard → SQL Editor → Run
-- (بعد supabase-setup-auth.sql و supabase-setup-edge.sql).
--
-- مهم: شغّله قبل ما ترفع نسخة track/index.ts الجديدة، لأن الدالة الجديدة
-- بتكتب في عمود country اللي الملف ده بيضيفه.
--
-- بيعمل إيه:
--  1) بيضيف عمود country (كود الدولة، حرفين زي EG) على site_events.
--  2) بيعمل دالة get_site_insights(p_days) للأدمن بس، وبترجّع كل أرقام اللوحة
--     في طلب واحد: مقارنة بالفترة اللي قبلها، اليومي، الدول، المصادر،
--     الأجهزة، الساعات، والأيام. الأيام والساعات بتوقيت القاهرة.
--  3) بتستبعد الزحف الآلي (bots) من الأرقام.
-- =====================================================================

alter table site_events add column if not exists country text;
create index if not exists site_events_country_idx on site_events (country);

create or replace function get_site_insights(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d      int         := least(greatest(coalesce(p_days, 30), 1), 365);
  today  date        := (now() at time zone 'Africa/Cairo')::date;
  s      timestamptz := ((today - (d - 1))::timestamp) at time zone 'Africa/Cairo';
  ps     timestamptz := ((today - (2 * d - 1))::timestamp) at time zone 'Africa/Cairo';
  result jsonb;
begin
  if not is_admin() then raise exception 'unauthorized'; end if;

  result := (
    with ev as (
      select e.visitor_id, e.event_type, e.country, e.created_at,
        (e.created_at at time zone 'Africa/Cairo') as lt,
        case
          when coalesce(e.referrer, '') = '' or e.referrer ilike '%almo5m.github.io%' then 'direct'
          when e.referrer ilike '%google.%' then 'google'
          when e.referrer ilike '%youtube.%' or e.referrer ilike '%youtu.be%' then 'youtube'
          when e.referrer ilike '%whatsapp.%' or e.referrer ilike '%wa.me%' then 'whatsapp'
          when e.referrer ilike '%facebook.%' or e.referrer ilike '%fb.com%' or e.referrer ilike '%fb.me%' then 'facebook'
          when e.referrer ilike '%instagram.%' then 'instagram'
          when e.referrer ilike '%tiktok.%' then 'tiktok'
          when e.referrer ilike '%t.me%' or e.referrer ilike '%telegram.%' then 'telegram'
          when e.referrer ~* '^https?://(www\.)?(x|twitter)\.com' or e.referrer ~* '^https?://t\.co' then 'x'
          when e.referrer ilike '%bing.%' or e.referrer ilike '%duckduckgo.%' or e.referrer ilike '%yahoo.%' then 'search'
          else 'other'
        end as src,
        case
          when e.user_agent ilike '%android%' then 'android'
          when e.user_agent ilike '%iphone%' or e.user_agent ilike '%ipad%' or e.user_agent ilike '%ipod%' then 'ios'
          when e.user_agent ilike '%windows%' or e.user_agent ilike '%macintosh%' or e.user_agent ilike '%x11%' or e.user_agent ilike '%cros%' then 'desktop'
          else 'other'
        end as dev
      from site_events e
      where e.created_at >= ps
        and coalesce(e.user_agent, '') !~* '(bot|spider|crawl|headless|lighthouse|preview)'
    ),
    vis as (
      select distinct on (ev.visitor_id)
        ev.visitor_id, ev.src, ev.dev, coalesce(ev.country, '??') as country,
        exists (
          select 1 from site_events o
          where o.visitor_id = ev.visitor_id and o.event_type = 'page_view' and o.created_at < s
        ) as is_returning
      from ev
      where ev.event_type = 'page_view' and ev.created_at >= s
      order by ev.visitor_id, ev.created_at
    ),
    dl as (
      select distinct visitor_id from ev where event_type = 'download_clicked' and created_at >= s
    )
    select jsonb_build_object(
      'days', d,
      'generated_at', now(),
      'kpi', (
        select jsonb_build_object(
          'cur', jsonb_build_object(
            'visitors',   count(distinct visitor_id) filter (where event_type = 'page_view' and created_at >= s),
            'views',      count(*)                   filter (where event_type = 'page_view' and created_at >= s),
            'reached',    count(distinct visitor_id) filter (where event_type = 'reached_download' and created_at >= s),
            'downloaded', count(distinct visitor_id) filter (where event_type = 'download_clicked' and created_at >= s),
            'whatsapp',   count(distinct visitor_id) filter (where event_type = 'whatsapp_followed' and created_at >= s)),
          'prev', jsonb_build_object(
            'visitors',   count(distinct visitor_id) filter (where event_type = 'page_view' and created_at >= ps and created_at < s),
            'views',      count(*)                   filter (where event_type = 'page_view' and created_at >= ps and created_at < s),
            'reached',    count(distinct visitor_id) filter (where event_type = 'reached_download' and created_at >= ps and created_at < s),
            'downloaded', count(distinct visitor_id) filter (where event_type = 'download_clicked' and created_at >= ps and created_at < s),
            'whatsapp',   count(distinct visitor_id) filter (where event_type = 'whatsapp_followed' and created_at >= ps and created_at < s)))
        from ev),
      'daily', (
        select coalesce(jsonb_agg(row_to_json(x) order by x.day), '[]'::jsonb)
        from (
          select g::date as day,
            count(*) filter (where ev.event_type = 'page_view') as views,
            count(distinct ev.visitor_id) filter (where ev.event_type = 'page_view') as visitors,
            count(distinct ev.visitor_id) filter (where ev.event_type = 'reached_download') as reached,
            count(distinct ev.visitor_id) filter (where ev.event_type = 'download_clicked') as downloaded,
            count(distinct ev.visitor_id) filter (where ev.event_type = 'whatsapp_followed') as whatsapp
          from generate_series((today - (d - 1))::timestamp, today::timestamp, interval '1 day') g
          left join ev on ev.created_at >= s and ev.lt::date = g::date
          group by g
        ) x),
      'countries', (
        select coalesce(jsonb_agg(jsonb_build_object('code', c.country, 'visitors', c.n, 'downloads', c.dn) order by c.n desc), '[]'::jsonb)
        from (
          select country, count(*) as n, count(*) filter (where visitor_id in (select visitor_id from dl)) as dn
          from vis group by country order by n desc limit 40
        ) c),
      'sources', (
        select coalesce(jsonb_agg(jsonb_build_object('code', c.src, 'visitors', c.n, 'downloads', c.dn) order by c.n desc), '[]'::jsonb)
        from (
          select src, count(*) as n, count(*) filter (where visitor_id in (select visitor_id from dl)) as dn
          from vis group by src order by n desc
        ) c),
      'devices', (
        select coalesce(jsonb_agg(jsonb_build_object('code', c.dev, 'visitors', c.n, 'downloads', c.dn) order by c.n desc), '[]'::jsonb)
        from (
          select dev, count(*) as n, count(*) filter (where visitor_id in (select visitor_id from dl)) as dn
          from vis group by dev order by n desc
        ) c),
      'visitor_type', (
        select jsonb_build_object(
          'new', count(*) filter (where not is_returning),
          'returning', count(*) filter (where is_returning))
        from vis),
      'hours', (
        select jsonb_agg(coalesce(c.n, 0) order by h)
        from generate_series(0, 23) h
        left join (
          select extract(hour from lt)::int as hr, count(*) as n
          from ev where event_type = 'page_view' and created_at >= s group by 1
        ) c on c.hr = h),
      'weekdays', (
        select jsonb_agg(coalesce(c.n, 0) order by w)
        from generate_series(0, 6) w
        left join (
          select extract(dow from lt)::int as dw, count(*) as n
          from ev where event_type = 'page_view' and created_at >= s group by 1
        ) c on c.dw = w)
    )
  );
  return result;
end;
$$;

revoke all on function get_site_insights(int) from public, anon;
grant execute on function get_site_insights(int) to authenticated;
