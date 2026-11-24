"""Build the unchanged static site and reassemble byte-identical film files."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
EXCLUDE = {'.git', '.github', '.gitignore', 'README.md', 'scripts', 'video-parts', '_site'}

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for source in ROOT.iterdir():
    if source.name in EXCLUDE:
        continue
    target = OUT / source.name
    if source.is_dir():
        shutil.copytree(source, target)
    else:
        shutil.copy2(source, target)

for movie in json.loads((ROOT / 'scripts/videos.json').read_text()):
    target = OUT / movie['path']
    target.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    with target.open('wb') as output:
        for part in movie['parts']:
            with (ROOT / part).open('rb') as source:
                for block in iter(lambda: source.read(1024 * 1024), b''):
                    output.write(block)
                    digest.update(block)
                    size += len(block)
    if size != movie['size'] or digest.hexdigest() != movie['sha256']:
        raise RuntimeError('Film integrity verification failed: ' + movie['path'])
    print('Verified original film:', movie['path'])

if not (OUT / 'index.html').is_file():
    raise RuntimeError('Missing website entry point')
