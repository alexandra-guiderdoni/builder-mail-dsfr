"""Régressions des octets livrés et du renouvellement du cache, sans écrire les sources."""

import importlib.util
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def module(name):
    spec = importlib.util.spec_from_file_location(
        name, ROOT / "scripts" / (name + ".py")
    )
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class BuildContract(unittest.TestCase):
    def test_each_icon_and_manifest_change_the_worker(self):
        read_bytes, read_text, dumps = (
            Path.read_bytes,
            Path.read_text,
            __import__("json").dumps,
        )
        for name, icons in [
            ("build", ["prototype/source/icon.svg"]),
            (
                "build_app",
                [
                    "app/assets/icon.svg",
                    "app/assets/icon-192.png",
                    "app/assets/icon-512.png",
                ],
            ),
        ]:
            build = module(name)
            baseline = build.build()
            worker = build.DIST / "web/sw.js"
            self.assertEqual(baseline, build.build())
            for relative in icons:
                target = ROOT / relative
                with self.subTest(icon=relative):
                    with (
                        patch.object(
                            Path,
                            "read_bytes",
                            lambda p, _target=target: (
                                read_bytes(p) + b"<!-- test -->"
                                if p == _target
                                else read_bytes(p)
                            ),
                        ),
                        patch.object(
                            Path,
                            "read_text",
                            lambda p, *a, _target=target, **kw: (
                                read_text(p, *a, **kw) + "<!-- test -->"
                                if p == _target
                                else read_text(p, *a, **kw)
                            ),
                        ),
                    ):
                        changed = build.build()
                    self.assertNotEqual(baseline[worker], changed[worker])

            def changed_manifest(value, *args, **kwargs):
                if isinstance(value, dict) and "start_url" in value:
                    value = dict(value, theme_color="#222222")
                return dumps(value, *args, **kwargs)

            with patch("json.dumps", changed_manifest):
                self.assertNotEqual(baseline[worker], build.build()[worker])

    def test_ascii_locale_and_utf8_lf_bytes(self):
        env = dict(os.environ, LC_ALL="C", PYTHONUTF8="0", PYTHONCOERCECLOCALE="0")
        for name in ["build", "build_app"]:
            result = subprocess.run(
                [sys.executable, "scripts/" + name + ".py", "--check"],
                cwd=ROOT,
                env=env,
                capture_output=True,
                check=False,
            )
            self.assertEqual(
                result.returncode, 0, result.stderr.decode("utf-8", errors="replace")
            )
            for path, content in module(name).build().items():
                content = (
                    content.encode("utf-8") if isinstance(content, str) else content
                )
                if path.suffix != ".png":
                    content.decode("utf-8")
                    self.assertNotIn(b"\r", content)

    def test_check_detects_crlf_bytes(self):
        read_bytes = Path.read_bytes
        for name in ["build", "build_app"]:
            build = module(name)
            target = build.DIST / "web/index.html"
            with (
                patch.object(
                    Path,
                    "read_bytes",
                    lambda p, _target=target: (
                        read_bytes(p).replace(b"\n", b"\r\n")
                        if p == _target
                        else read_bytes(p)
                    ),
                ),
                patch.object(sys, "argv", ["build", "--check"]),
                self.assertRaises(SystemExit),
            ):
                build.main()


if __name__ == "__main__":
    unittest.main()
