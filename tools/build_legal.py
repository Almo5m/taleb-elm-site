#!/usr/bin/env python3
"""يبني صفحات الشروط والخصوصية وشروط المنتدى من legal/legal_content.md.

لو عدّلت النص: غيّره في legal/legal_content.md وشغّل  python3 tools/build_legal.py
(كل نص بيبدأ بـ "# عنوان" وبينتهي عند الفاصل ---). الصفحات بتتكتب في terms/ و privacy/ و forum-terms/.
"""
import html, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
# نصوص التطبيق (الـ 3 الأولانيين) ونص الموقع نفسه في ملفين منفصلين
SOURCES = [ROOT / 'legal' / 'legal_content.md', ROOT / 'legal' / 'site_privacy.md']

# العنوان في الملف -> فولدر الصفحة
PAGES = {
    'شروط الاستخدام': 'terms',
    'سياسة الخصوصية': 'privacy',
    'شروط استخدام المنتدى': 'forum-terms',
    'خصوصية الموقع': 'site-privacy',
}
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


def page(title, updated, sections):
    """صفحة عادية: عنوان، تاريخ، وبنود. من غير فهرس ولا روابط لصفحات تانية."""
    body = '\n\n    '.join(
        f'<section>\n      <h2>{n}. {esc(name)}</h2>\n      {render_body(b)}\n    </section>' for n, name, b in sections)
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} — طالب علم</title>
<meta name="description" content="{esc(title)} لتطبيق طالب علم — آخر تحديث {esc(updated)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<link rel="icon" href="../favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/legal.css">
</head>
<body>
<header class="top">
  <a class="brand" href="../"><img src="../assets/app-icon.png" alt="" width="36" height="36"><span>طالب علم</span></a>
</header>

<main>
  <h1>{esc(title)}</h1>
  <p class="updated">آخر تحديث: {esc(updated)}</p>

    {body}
</main>

<footer>
  <a class="sign" href="https://www.facebook.com/share/1HvQMbwYYV/" target="_blank" rel="noopener noreferrer" aria-label="AL MO"><img class="on-light" src="../assets/brand/almo-logo-light.png" alt="AL MO" width="56" height="56"><img class="on-dark" src="../assets/brand/almo-logo.png" alt="" width="56" height="56"></a>
  <p>© 2026 طالب علم — صُنع بحب لطلاب مصر</p>
</footer>
</body>
</html>
'''


def main():
    docs = [d for src in SOURCES for d in parse(src.read_text(encoding='utf-8'))]
    for title, updated, sections in docs:
        slug = PAGES[title]
        out = ROOT / slug / 'index.html'
        out.parent.mkdir(exist_ok=True)
        out.write_text(page(title, updated, sections), encoding='utf-8')
        print(f'{slug}/  ({len(sections)} بند)')


if __name__ == '__main__':
    main()
