"""SSH/SCP helper for production deployment to 89.124.116.167.
Usage:
  python .deploy_helper.py exec '<shell command>'
  python .deploy_helper.py exec_stream '<shell command>'   # streams output
  python .deploy_helper.py upload <local> <remote>
  python .deploy_helper.py download <remote> <local>
"""
import sys
import paramiko
import os
import stat as _stat
import io as _io
sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = _io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = "89.124.116.167"
PORT = 22
USER = "root"
PASS = "Lolmol123#Lolmol123#"


def _connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PASS,
              timeout=20, allow_agent=False, look_for_keys=False, banner_timeout=20)
    return c


def exec_cmd(cmd: str, stream: bool = False, timeout: int = 600) -> int:
    c = _connect()
    try:
        stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout, get_pty=False)
        if stream:
            for line in iter(stdout.readline, ""):
                if not line:
                    break
                sys.stdout.write(line)
                sys.stdout.flush()
            err = stderr.read().decode(errors="replace")
            if err.strip():
                sys.stderr.write(err)
        else:
            out = stdout.read().decode(errors="replace")
            err = stderr.read().decode(errors="replace")
            if out:
                sys.stdout.write(out)
            if err:
                sys.stderr.write(err)
        rc = stdout.channel.recv_exit_status()
        return rc
    finally:
        c.close()


def _sftp_mkdirs(sftp, remote_dir):
    parts = remote_dir.replace("\\", "/").split("/")
    acc = ""
    for p in parts:
        if not p:
            acc = "/" if not acc else acc
            continue
        acc = (acc.rstrip("/") + "/" + p) if acc else "/" + p
        try:
            sftp.stat(acc)
        except FileNotFoundError:
            sftp.mkdir(acc)


def _is_excluded(name: str) -> bool:
    excludes = {".git", "node_modules", ".venv", "venv", "__pycache__",
                ".pytest_cache", ".vite", "dist", "build", "tests",
                ".idea", ".vscode", "vite.log", "server.log", "admin_api.log",
                "bot.log", "bot_err.log", ".deploy_helper.py", "lexai.db"}
    return name in excludes or name.endswith(".pyc")


def upload(local: str, remote: str):
    c = _connect()
    sftp = c.open_sftp()
    try:
        if os.path.isdir(local):
            base = os.path.abspath(local)
            for root, dirs, files in os.walk(base):
                dirs[:] = [d for d in dirs if not _is_excluded(d)]
                rel = os.path.relpath(root, base).replace("\\", "/")
                rdir = remote if rel == "." else f"{remote}/{rel}"
                _sftp_mkdirs(sftp, rdir)
                for f in files:
                    if _is_excluded(f):
                        continue
                    lp = os.path.join(root, f)
                    rp = f"{rdir}/{f}"
                    sftp.put(lp, rp)
                    # preserve mode
                    sftp.chmod(rp, os.stat(lp).st_mode & 0o777)
        else:
            _sftp_mkdirs(sftp, os.path.dirname(remote))
            sftp.put(local, remote)
            sftp.chmod(remote, os.stat(local).st_mode & 0o777)
        print(f"uploaded: {local} → {remote}")
    finally:
        sftp.close()
        c.close()


def download(remote: str, local: str):
    c = _connect()
    sftp = c.open_sftp()
    try:
        os.makedirs(os.path.dirname(local) or ".", exist_ok=True)
        sftp.get(remote, local)
        print(f"downloaded: {remote} → {local}")
    finally:
        sftp.close()
        c.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    op = sys.argv[1]
    if op == "exec":
        rc = exec_cmd(sys.argv[2], stream=False)
        sys.exit(rc)
    elif op == "exec_stream":
        rc = exec_cmd(sys.argv[2], stream=True)
        sys.exit(rc)
    elif op == "upload":
        upload(sys.argv[2], sys.argv[3])
    elif op == "download":
        download(sys.argv[2], sys.argv[3])
    else:
        print(f"unknown op: {op}")
        sys.exit(2)
