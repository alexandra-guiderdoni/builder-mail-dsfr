"""Cycle de vie du serveur de recette : la campagne ne ferme que le serveur qu’elle a lancé."""

import atexit
import signal
import socket
import subprocess
import time
from pathlib import Path


def port_is_open(host, port):
    with socket.socket() as probe:
        probe.settimeout(0.5)
        return probe.connect_ex((host, port)) == 0


class RecipeServer:
    """Utilise un serveur déjà présent sur le port, sinon lance `audit_server.cjs`."""

    def __init__(self, port, root, env, host="127.0.0.1", timeout=15):
        self.port, self.root, self.env = port, Path(root), env
        self.host, self.timeout = host, timeout
        self.process = None
        self.owned = False

    def start(self):
        if port_is_open(self.host, self.port):
            self.owned = False  # serveur préexistant : jamais arrêté par la campagne
            return self
        self.process = subprocess.Popen(
            ["node", str(self.root / "scripts" / "audit_server.cjs")],
            cwd=self.root,
            env={**self.env, "BUILDER_AUDIT_PORT": str(self.port)},
            stdout=subprocess.DEVNULL,
        )
        self.owned = True
        deadline = time.monotonic() + self.timeout
        while not port_is_open(self.host, self.port):
            if self.process.poll() is not None or time.monotonic() > deadline:
                self.close()
                raise RuntimeError("le serveur de recette ne répond pas sur le port " + str(self.port))
            time.sleep(0.05)
        return self

    def close(self):
        process, self.process = self.process, None
        if not self.owned or process is None or process.poll() is not None:
            return
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.close()


def install_cleanup(server):
    """Ferme le serveur propriétaire à la sortie, sur succès, exception ou signal."""
    atexit.register(server.close)

    def stop(number, frame):
        raise SystemExit(128 + number)

    signal.signal(signal.SIGTERM, stop)
