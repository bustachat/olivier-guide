"""
Fix garbled UTF-8/CP1252 mojibake in all JSON data files.
Reconstructs garbled strings programmatically from Unicode code points
to avoid encoding issues in the script itself.
"""

import os

REPO = os.path.dirname(os.path.abspath(__file__))

def mojibake(char):
    """Convert a Unicode char to its garbled CP1252-mojibaked form."""
    return char.encode('utf-8').decode('cp1252')

# Build replacement map from correct char -> garbled form
CORRECT_CHARS = [
    '—',  # em dash
    '–',  # en dash
    '→',  # right arrow
    '’',  # right single quote
    '‘',  # left single quote
    '“',  # left double quote
    '”',  # right double quote
    '•',  # bullet
    '…',  # ellipsis
]

REPLACEMENTS = []
for char in CORRECT_CHARS:
    try:
        garbled = mojibake(char)
        REPLACEMENTS.append((garbled, char))
        print(f'  mapping: {repr(garbled)} -> {repr(char)}')
    except (UnicodeDecodeError, UnicodeEncodeError):
        print(f'  skip: {repr(char)} (not in CP1252)')

# Also handle non-breaking space
try:
    garbled_nbsp = 'Â '  # common mojibake for NBSP
    REPLACEMENTS.append((garbled_nbsp, ' '))
    print(f'  mapping: {repr(garbled_nbsp)} -> space')
except Exception:
    pass

print()

FILES = [
    'data/aac.json',
    'data/acc.json',
    'data/big-east.json',
    'data/big-ten.json',
    'data/big-west.json',
    'data/caa.json',
    'data/d1-other.json',
    'data/juco.json',
    'data/ivy.json',
    'data/d2.json',
    'data/coaches.json',
    'data/conferences.json',
    'data/conf-prestige.json',
    'data/pipeline.json',
    'athletes/olivier.json',
]

total_fixed = 0
for filename in FILES:
    filepath = os.path.join(REPO, filename)
    if not os.path.exists(filepath):
        print(f'  SKIP (not found): {filename}')
        continue

    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    original = content
    for bad, good in REPLACEMENTS:
        content = content.replace(bad, good)

    if content != original:
        fixes = sum(original.count(b) for b, g in REPLACEMENTS)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  FIXED {filename}: {fixes} occurrences')
        total_fixed += 1
    else:
        print(f'  clean: {filename}')

print(f'\nDone. {total_fixed} files updated.')
