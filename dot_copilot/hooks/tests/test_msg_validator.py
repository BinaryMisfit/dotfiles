import subprocess
import sys
from pathlib import Path

def test_msg_validator_allows_ok(tmp_path, monkeypatch):
    msg = tmp_path / 'msg.txt'
    msg.write_text('Fix bug\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>')
    py = sys.executable
    script = Path(__file__).parents[1] / 'msg-validator.py'
    proc = subprocess.run([py, str(script), str(msg)], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr


def test_msg_validator_blocks_lore(tmp_path):
    msg = tmp_path / 'msg.txt'
    msg.write_text('Add feature\n\nThis is Vault work')
    py = sys.executable
    script = Path(__file__).parents[1] / 'msg-validator.py'
    proc = subprocess.run([py, str(script), str(msg)], capture_output=True, text=True)
    assert proc.returncode != 0
