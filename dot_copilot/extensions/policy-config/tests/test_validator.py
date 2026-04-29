import os
import sys
import subprocess
from pathlib import Path

def run_validator():
    py = sys.executable
    cmd = [py, str(Path(__file__).parents[1] / 'validator.py'), 'locate']
    env = os.environ.copy()
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env)
    return proc.returncode, proc.stdout, proc.stderr


def test_locate_builtin():
    # With no files present, should print <builtin>. If a user-level rules file exists in the environment,
    # the validator will return its path instead; accept either.
    rc, out, err = run_validator()
    assert rc == 0
    assert ('<builtin>' in out) or ('gitflow.yml' in out)
