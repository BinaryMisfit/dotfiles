#!/usr/bin/env python3
"""Add an entry to ~/.copilot/kira_memory.json atomically.
Usage: add_kira_memory.py --type TYPE --tags tag1,tag2 --summary "short summary"
"""
import argparse, json, os, uuid, datetime, tempfile

HOME = os.path.expanduser('~')
COPILOT = os.path.join(HOME, '.copilot')
OUT = os.path.join(COPILOT, 'kira_memory.json')

p = argparse.ArgumentParser()
p.add_argument('--type', default='note')
p.add_argument('--tags', default='')
p.add_argument('--summary', required=True)
args = p.parse_args()

entry = {
    'id': str(uuid.uuid4()),
    'ts': datetime.datetime.utcnow().isoformat() + 'Z',
    'type': args.type,
    'tags': [t for t in args.tags.split(',') if t],
    'summary': args.summary
}

os.makedirs(COPILOT, exist_ok=True)
# load existing
if os.path.exists(OUT):
    try:
        with open(OUT, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, list):
                data = []
    except Exception:
        data = []
else:
    data = []

# simple redact: remove lines that look like secrets (very conservative)
def looks_sensitive(s):
    low = s.lower()
    for sub in ('password','passwd','secret','token','key','ssn','credential'):
        if sub in low:
            return True
    return False

if looks_sensitive(entry['summary']):
    print('Refusing to store likely-sensitive summary')
    raise SystemExit(1)

data.append(entry)
# write atomically
fd, tmp = tempfile.mkstemp(dir=COPILOT)
with os.fdopen(fd, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.flush()
    os.fsync(f.fileno())
# backup
bak = OUT + '.bak'
if os.path.exists(OUT):
    try:
        os.replace(OUT, bak)
    except Exception:
        pass
os.replace(tmp, OUT)
try:
    os.chmod(OUT, 0o600)
except Exception:
    pass
print('Saved memory entry', entry['id'])
