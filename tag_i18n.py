#!/usr/bin/env python3
"""
Auto-tags static Arabic UI copy with data-i18n in a VIP invitation template,
so vip-i18n.js can translate it (in addition to the already-dynamic
[data-bind] fields, which need no tagging).

Rules (see accompanying explanation in chat):
- Skip <script>, <style>, <svg> (and descendants), <title>.
- Skip anything inside [data-einvite-langswitch] (the EN/ع buttons themselves).
- Skip anything already carrying data-bind, data-i18n, or data-i18n-skip.
- Skip decorative monogram/initial letters (class contains "monogram" or
  "envw-letters") - translating "A&B" initials word-for-word is meaningless.
- Only tag elements/text that contain at least one Arabic character.
- Step 1: wrap bare Arabic text nodes that sit directly inside a mixed-content
  element (e.g. <a>...<svg/> النص</a>) in a new <span data-i18n>.
- Step 2: tag the outermost remaining elements whose only children are text
  and/or purely-inline formatting tags (em/i/b/strong/br/sup/sub/mark) with
  data-i18n directly (no wrapper needed).
- Also tags data-i18n-placeholder on <input>/<textarea> placeholder attrs
  that contain Arabic text.
"""
import sys
import re
from bs4 import BeautifulSoup, NavigableString, Tag

ARABIC_RE = re.compile(r'[\u0600-\u06FF]')
INLINE_OK = {'em', 'i', 'b', 'strong', 'br', 'sup', 'sub', 'mark'}
SKIP_ANCESTOR_TAGS = {'script', 'style', 'svg', 'title'}
MONOGRAM_CLASS_RE = re.compile(r'monogram|envw-letters', re.I)


def has_arabic(text):
    return bool(text) and bool(ARABIC_RE.search(text))


def within_skip_ancestor(tag):
    for parent in tag.parents:
        if not isinstance(parent, Tag):
            continue
        if parent.name in SKIP_ANCESTOR_TAGS:
            return True
        if parent.has_attr('data-einvite-langswitch'):
            return True
        cls = ' '.join(parent.get('class', []))
        if MONOGRAM_CLASS_RE.search(cls):
            return True
    return False


def is_monogram(tag):
    cls = ' '.join(tag.get('class', []))
    return bool(MONOGRAM_CLASS_RE.search(cls))


def already_marked_or_bound(tag):
    return tag.has_attr('data-bind') or tag.has_attr('data-i18n') or tag.has_attr('data-i18n-skip')


def has_block_child(tag):
    for child in tag.children:
        if isinstance(child, NavigableString):
            continue
        if not isinstance(child, Tag):
            continue
        if child.name in INLINE_OK:
            continue
        return True
    return False


def step1_wrap_bare_text(soup):
    wrapped = 0
    # Snapshot tags first since we'll be mutating the tree while iterating.
    all_tags = list(soup.find_all(True))
    for tag in all_tags:
        if tag.name in SKIP_ANCESTOR_TAGS:
            continue
        if within_skip_ancestor(tag) or is_monogram(tag):
            continue
        if not has_block_child(tag):
            # No mixed content here (either pure text or pure inline) -
            # handled by step 2 instead.
            continue
        # Mixed content: look for direct NavigableString children with
        # actual Arabic text that aren't already inside a tagged/bound tag.
        for child in list(tag.children):
            if not isinstance(child, NavigableString):
                continue
            stripped = child.strip()
            if not stripped or not has_arabic(stripped):
                continue
            # Preserve surrounding whitespace outside the wrapped span so
            # spacing next to icons/siblings doesn't collapse.
            leading_ws = child[:len(child) - len(child.lstrip())]
            trailing_ws = child[len(child.rstrip()):]
            new_span = soup.new_tag('span')
            new_span['data-i18n'] = ''
            new_span.string = stripped
            child.replace_with(NavigableString(leading_ws), new_span, NavigableString(trailing_ws))
            wrapped += 1
    return wrapped


def step2_tag_leaf_elements(soup):
    candidates = []
    for tag in soup.find_all(True):
        if tag.name in SKIP_ANCESTOR_TAGS:
            continue
        if already_marked_or_bound(tag):
            continue
        if within_skip_ancestor(tag) or is_monogram(tag):
            continue
        if has_block_child(tag):
            continue
        text = tag.get_text().strip()
        if not text or not has_arabic(text):
            continue
        candidates.append(tag)

    # Keep only outermost candidates (drop any whose ancestor is also a
    # candidate) so we tag a phrase once, not once per nested inline tag.
    candidate_set = set(id(c) for c in candidates)
    outermost = []
    for tag in candidates:
        if any(id(p) in candidate_set for p in tag.parents if isinstance(p, Tag)):
            continue
        outermost.append(tag)

    for tag in outermost:
        tag['data-i18n'] = ''
    return len(outermost)


def step3_tag_placeholders(soup):
    count = 0
    for tag in soup.find_all(['input', 'textarea']):
        ph = tag.get('placeholder')
        if ph and has_arabic(ph) and not tag.has_attr('data-i18n-placeholder'):
            tag['data-i18n-placeholder'] = ''
            count += 1
    return count


def process(path):
    html = open(path, encoding='utf-8').read()
    soup = BeautifulSoup(html, 'html.parser')

    n1 = step1_wrap_bare_text(soup)
    n2 = step2_tag_leaf_elements(soup)
    n3 = step3_tag_placeholders(soup)

    out = str(soup)
    open(path, 'w', encoding='utf-8').write(out)
    return n1, n2, n3, len(out)


if __name__ == '__main__':
    for path in sys.argv[1:]:
        n1, n2, n3, size = process(path)
        print(f'{path}: wrapped={n1} tagged_leaf={n2} placeholders={n3} bytes={size}')
