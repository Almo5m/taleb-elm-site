#!/usr/bin/env python3
"""يبني صفحات الشروط والخصوصية وشروط المنتدى من legal/legal_content.md.

لو عدّلت النص: غيّره في legal/legal_content.md وشغّل  python3 tools/build_legal.py
(كل نص بيبدأ بـ "# عنوان" وبينتهي عند الفاصل ---). الصفحات بتتكتب في terms/ و privacy/ و forum-terms/.
"""
import html, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
# نصوص التطبيق (الـ 3 الأولانيين) ونص الموقع نفسه في ملفين منفصلين
SOURCES = [ROOT / 'legal' / 'legal_content.md', ROOT / 'legal' / 'site_privacy.md']

# العنوان في الملف -> (فولدر الصفحة، أيقونة)
PAGES = {
    'شروط الاستخدام': ('terms', 'doc'),
    'سياسة الخصوصية': ('privacy', 'shield'),
    'شروط استخدام المنتدى': ('forum-terms', 'chat'),
    'خصوصية الموقع': ('site-privacy', 'shield'),
}
ICONS = {
    'doc': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    'shield': '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    'chat': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
}
SUN = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8"/>'
MOON = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>'
esc = html.escape


def lead(text):
    """اللي قبل أول نقطتين (لو قصير) بيتعمله بولد، من غير ما نغيّر النص"""
    m = re.match(r'^([^:]{2,28}:)\s(.+)$', text, re.S)
    return f'<strong>{esc(m.group(1))}</strong> {esc(m.group(2))}' if m else esc(text)


def render_body(body):
    out = []
    for block in re.split(r'\n\s*\n', body.strip()):
        items = []
        for line in block.split('\n'):
            line = line.strip()
            if line.startswith('•'):
                items.append(lead(line.lstrip('• ').strip()))
                continue
            if items:
                out.append('<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'); items = []
            if line:
                out.append(f'<p>{lead(line)}</p>')
        if items:
            out.append('<ul>' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>')
    return '\n      '.join(out)


def parse(text):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    docs = []
    for chunk in text.split('\n---\n'):
        chunk = chunk.strip()
        if not chunk:
            continue
        head, *secs = re.split(r'\n## ', chunk)
        title = re.match(r'# (.+)', head).group(1).strip()
        updated = re.search(r'آخر تحديث:\s*(.+)', head).group(1).strip()
        sections = []
        for s in secs:
            h, _, body = s.partition('\n')
            num, name = re.match(r'(\d+)\.\s*(.+)', h.strip()).groups()
            sections.append((num, name.strip(), body))
        docs.append((title, updated, sections))
    return docs


def page(title, updated, sections, slug, icon, all_pages):
    tabs = ''.join(
        f'<a href="../{s}/"{" aria-current=\"page\"" if s == slug else ""}>{esc(t)}</a>' for t, s in all_pages)
    toc = ''.join(f'<li><a href="#s{n}"><b>{n}</b>{esc(name)}</a></li>' for n, name, _ in sections)
    body = '\n\n    '.join(
        f'<section class="sheet" id="s{n}"><span class="num" aria-hidden="true">{n}</span><h2>{esc(name)}</h2>\n      {render_body(b)}\n    </section>'
        for n, name, b in sections)
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{esc(title)} — طالب علم</title>
<meta name="description" content="{esc(title)} لتطبيق طالب علم — آخر تحديث {esc(updated)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<link rel="icon" href="../favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
<script src="../assets/js/theme.js"></script>
<link rel="stylesheet" href="../assets/css/legal.css">
</head>
<body>
<div class="progress" id="progress" aria-hidden="true"></div>

<header class="bar" id="bar">
  <a class="brand" href="../"><img src="../assets/app-icon.png" alt="" width="36" height="36"><span>طالب علم</span></a>
  <button class="theme-toggle" id="themeToggle" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" class="i-sun">{SUN}</svg><svg viewBox="0 0 24 24" class="i-moon">{MOON}</svg></button>
  <nav class="legal-tabs" aria-label="الصفحات القانونية">{tabs}</nav>
</header>

<main class="wrap">
  <div class="doc-head">
    <span class="doc-icon"><svg viewBox="0 0 24 24">{ICONS[icon]}</svg></span>
    <h1>{esc(title)}</h1>
    <p class="updated">آخر تحديث: {esc(updated)}</p>
  </div>

  <div class="doc-layout">
    <nav class="toc" aria-label="فهرس الصفحة"><ol>{toc}</ol></nav>
    <div class="sheets">
    {body}
    </div>
  </div>
</main>

<footer class="foot">
  <a class="foot-sign" href="https://www.facebook.com/share/1HvQMbwYYV/" target="_blank" rel="noopener noreferrer" aria-label="AL MO"><img class="logo-on-light" src="../assets/brand/almo-logo-light.png" alt="AL MO" width="56" height="56"><img class="logo-on-dark" src="../assets/brand/almo-logo.png" alt="" width="56" height="56"></a>
  <p>© 2026 طالب علم — صُنع بحب لطلاب مصر</p>
  <p><a href="../">الرجوع لموقع طالب علم</a></p>
</footer>
<script src="../assets/js/legal.js"></script>
</body>
</html>
'''


def main():
    docs = [d for src in SOURCES for d in parse(src.read_text(encoding='utf-8'))]
    all_pages = [(t, PAGES[t][0]) for t, _, _ in docs]
    for title, updated, sections in docs:
        slug, icon = PAGES[title]
        out = ROOT / slug / 'index.html'
        out.parent.mkdir(exist_ok=True)
        out.write_text(page(title, updated, sections, slug, icon, all_pages), encoding='utf-8')
        print(f'{slug}/  ({len(sections)} بند)')


if __name__ == '__main__':
    main()
