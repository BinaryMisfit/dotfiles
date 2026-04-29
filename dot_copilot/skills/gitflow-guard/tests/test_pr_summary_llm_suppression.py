import subprocess
import sys
from pathlib import Path

def test_pr_summary_suppresses_llm(tmp_path):
    # create a large temp file to simulate big diff
    f = tmp_path / 'big.py'
    f.write_text('\n'.join(['print(\"x\")' for _ in range(2000)]))
    py = sys.executable
    skill = Path(__file__).parents[1] / 'skill.py'
    # set a small max_summary_tokens via a temporary rules file
    rules_dir = Path.home() / '.copilot' / 'rules'
    rules_dir.mkdir(parents=True, exist_ok=True)
    cfg = rules_dir / 'gitflow.yml'
    cfg.write_text('llm:\n  max_summary_tokens: 100\n  hunk_cap_files: 3\n  max_tokens_per_file: 50\n')
    proc = subprocess.run([py, str(skill), 'pr-summary', '--files', str(f), '--title', 'T', '--body', 'B', '--use-llm'], capture_output=True, text=True)
    assert proc.returncode == 0
    assert 'LLM suppressed' in proc.stdout or 'estimated_tokens' in proc.stdout
