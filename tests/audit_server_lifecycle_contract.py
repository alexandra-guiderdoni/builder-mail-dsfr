"""Contrat du cycle de vie du serveur de recette : propriété, fermeture, serveur externe."""

import ast
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from audit_server_lifecycle import RecipeServer, port_is_open

checks = 0


def check(condition, message):
    global checks
    if not condition:
        raise SystemExit("ÉCHEC : " + message)
    checks += 1


def free_port():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def status(port, route=""):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/{route}", timeout=5) as r:
            return r.status
    except urllib.error.HTTPError as error:
        return error.code


def wait_closed(port, seconds=10):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if not port_is_open("127.0.0.1", port):
            return True
        time.sleep(0.05)
    return False


output = tempfile.mkdtemp(prefix="audit-lifecycle-")
env = {**os.environ, "BUILDER_AUDIT_OUTPUT": output}

# 1. Campagne propriétaire : le serveur est lancé, utilisable, puis fermé.
port = free_port()
server = RecipeServer(port, ROOT, env)
server.start()
check(server.owned, "le serveur lancé par la campagne doit lui appartenir")
check(status(port) == 200, "le serveur lancé répond 200")
check(status(port, "mail/01.html") == 404, "ressource autorisée absente : 404")
check(status(port) == 200, "requête valide après le 404")
server.close()
check(wait_closed(port), "le serveur propriétaire est fermé par close()")
server.close()
check(True, "close() est idempotent")

# 2. Échec dans le corps de la campagne : fermeture quand même.
port = free_port()
try:
    with RecipeServer(port, ROOT, env) as owned:
        check(owned.owned, "contexte : serveur propriétaire")
        raise RuntimeError("échec simulé de la campagne")
except RuntimeError:
    pass
check(wait_closed(port), "le serveur est fermé après un échec de la campagne")

# 3. Serveur préexistant : jamais arrêté, ni par close() ni par le contexte.
port = free_port()
external = subprocess.Popen(
    ["node", "scripts/audit_server.cjs"],
    cwd=ROOT,
    env={**env, "BUILDER_AUDIT_PORT": str(port)},
    stdout=subprocess.DEVNULL,
)
try:
    deadline = time.monotonic() + 10
    while not port_is_open("127.0.0.1", port) and time.monotonic() < deadline:
        time.sleep(0.05)
    check(port_is_open("127.0.0.1", port), "le serveur externe est prêt")
    shared = RecipeServer(port, ROOT, env)
    shared.start()
    check(not shared.owned, "un serveur préexistant n’appartient pas à la campagne")
    shared.close()
    check(external.poll() is None, "close() n’arrête pas le serveur externe")
    check(status(port) == 200, "le serveur externe répond encore après close()")
    try:
        with RecipeServer(port, ROOT, env):
            raise RuntimeError("échec simulé")
    except RuntimeError:
        pass
    check(external.poll() is None, "un échec de campagne n’arrête pas le serveur externe")
    check(status(port) == 200, "le serveur externe répond encore après l’échec")
finally:
    external.kill()
    external.wait()

# 4. Processus de campagne réel : propriétaire puis externe, sortie en erreur ou SIGTERM.
program = """
import os, sys, time
sys.path.insert(0, {scripts!r})
from pathlib import Path
from audit_server_lifecycle import RecipeServer, install_cleanup
server = RecipeServer(int(sys.argv[1]), Path({root!r}), dict(os.environ))
server.start()
install_cleanup(server)
print("prêt " + str(server.owned), flush=True)
if sys.argv[2] == "erreur":
    raise RuntimeError("échec simulé")
time.sleep(60)
""".format(scripts=str(ROOT / "scripts"), root=str(ROOT))


def campaign(port, mode):
    return subprocess.Popen(
        [sys.executable, "-B", "-c", program, str(port), mode],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )


for mode in ("erreur", "sigterm"):
    port = free_port()
    process = campaign(port, mode)
    check(process.stdout.readline().strip() == "prêt True", mode + " : campagne propriétaire démarrée")
    check(port_is_open("127.0.0.1", port), mode + " : serveur ouvert pendant la campagne")
    if mode == "sigterm":
        process.send_signal(signal.SIGTERM)
    process.wait(timeout=20)
    check(process.returncode != 0, mode + " : la campagne sort en échec")
    check(wait_closed(port), mode + " : le serveur propriétaire est fermé")

    port = free_port()
    external = subprocess.Popen(
        ["node", "scripts/audit_server.cjs"], cwd=ROOT,
        env={**env, "BUILDER_AUDIT_PORT": str(port)}, stdout=subprocess.DEVNULL,
    )
    try:
        deadline = time.monotonic() + 10
        while not port_is_open("127.0.0.1", port) and time.monotonic() < deadline:
            time.sleep(0.05)
        process = campaign(port, mode)
        check(process.stdout.readline().strip() == "prêt False", mode + " : campagne sur serveur externe")
        if mode == "sigterm":
            process.send_signal(signal.SIGTERM)
        process.wait(timeout=20)
        check(external.poll() is None and status(port) == 200, mode + " : le serveur externe survit à la campagne")
    finally:
        external.kill()
        external.wait()

# 5. Le collecteur réel branche le cycle de vie (module non importable hors poste : lecture statique).
tree = ast.parse((ROOT / "scripts" / "audit_ay11.py").read_text())
names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
check({"RecipeServer", "install_cleanup"} <= names, "audit_ay11.py utilise RecipeServer et install_cleanup")

print(f"cycle de vie du serveur de recette : {checks} vérifications")
