import subprocess
import threading
import sys
import os
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
VENV_DIR = os.path.join(BACKEND_DIR, "venv")
VENV_PYTHON = os.path.join(VENV_DIR, "Scripts", "python.exe") if sys.platform == "win32" \
    else os.path.join(VENV_DIR, "bin", "python")


def setup_venv():
    if not os.path.exists(VENV_PYTHON):
        print("Virtual environment not found — creating it...")
        subprocess.run([sys.executable, "-m", "venv", VENV_DIR], check=True)
        print("Installing dependencies from requirements.txt...")
        pip = os.path.join(VENV_DIR, "Scripts", "pip.exe") if sys.platform == "win32" \
            else os.path.join(VENV_DIR, "bin", "pip")
        subprocess.run(
            [pip, "install", "-r", os.path.join(BACKEND_DIR, "requirements.txt")],
            check=True,
        )
        print("Dependencies installed.\n")
    else:
        print(f"Using venv: {VENV_DIR}")


def stream(proc, prefix):
    for line in iter(proc.stdout.readline, b""):
        print(f"{prefix} {line.decode(errors='replace').rstrip()}", flush=True)


def start_backend():
    return subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def start_frontend():
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    return subprocess.Popen(
        [npm, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def main():
    setup_venv()

    print("Starting backend  → http://localhost:8000")
    print("Starting frontend → http://localhost:5173")
    print("Press Ctrl+C to stop both.\n")

    backend = start_backend()
    frontend = start_frontend()

    for proc, label in [(backend, "\033[36m[backend] \033[0m"), (frontend, "\033[35m[frontend]\033[0m")]:
        t = threading.Thread(target=stream, args=(proc, label), daemon=True)
        t.start()

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\nStopping...")
        for proc in (backend, frontend):
            if proc.poll() is None:
                if sys.platform == "win32":
                    proc.send_signal(signal.CTRL_BREAK_EVENT)
                else:
                    proc.terminate()
        backend.wait()
        frontend.wait()
        print("Done.")


if __name__ == "__main__":
    main()
