#!/usr/bin/env python3
"""Androidリソース参照の検証。AAPT2のリンク失敗（@color/xxx not found 等）をビルド前に捕まえる。
   実行: python3 tools/check_android_res.py  ／ CI(codemagic)のビルド前にも走る。"""
import os, re, xml.etree.ElementTree as ET
RES = 'android/app/src/main/res'
MAN = 'android/app/src/main/AndroidManifest.xml'
defined = {}   # (type, name)
# 1) ファイル名で定義されるリソース（drawable/mipmap/layout/xml など）
for d in os.listdir(RES):
    p = os.path.join(RES, d)
    if not os.path.isdir(p): continue
    rtype = d.split('-')[0]
    for f in os.listdir(p):
        defined.setdefault(rtype, set()).add(os.path.splitext(f)[0])
# 2) values/*.xml の中で定義されるリソース
for d in os.listdir(RES):
    if not d.startswith('values'): continue
    p = os.path.join(RES, d)
    for f in os.listdir(p):
        if not f.endswith('.xml'): continue
        try: root = ET.parse(os.path.join(p, f)).getroot()
        except Exception as e: print('XML PARSE ERROR', os.path.join(p,f), e); continue
        for el in root:
            name = el.get('name')
            if not name: continue
            t = el.tag if el.tag != 'item' else (el.get('type') or 'item')
            defined.setdefault(t, set()).add(name)
            if el.tag == 'style': defined.setdefault('style', set()).add(name)
# 参照を集める
refs = set()
pat = re.compile(r'@(?:android:)?(color|drawable|mipmap|string|style|xml|layout|array|dimen|font|raw)/([A-Za-z0-9_.]+)')
targets = [MAN]
for d in os.listdir(RES):
    p = os.path.join(RES, d)
    if not os.path.isdir(p): continue
    for f in os.listdir(p):
        if f.endswith('.xml'): targets.append(os.path.join(p, f))
for t in targets:
    txt = open(t, encoding='utf-8').read()
    for m in pat.finditer(txt):
        if '@android:' in txt[max(0,m.start()-9):m.start()+1]: continue
        refs.add((m.group(1), m.group(2), t))
missing = []
for rtype, name, src in sorted(refs):
    pool = defined.get(rtype, set())
    if name in pool: continue
    if rtype == 'style' and name.split('.')[0] in defined.get('style', set()):
        # AppTheme.NoActionBar のような派生名は親が定義されていれば暗黙に有効
        if name in defined.get('style', set()): continue
    missing.append((rtype, name, src))
if missing:
    print('!! 参照切れ:')
    for r in missing: print('   @%s/%s  <- %s' % r)
else:
    print('OK: すべてのリソース参照が解決できます')
print('定義数:', {k: len(v) for k, v in sorted(defined.items())})
