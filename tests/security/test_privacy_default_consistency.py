"""The privacy default must agree across every distribution channel.

Jacob IBE personal fork: ENABLE_DATA_ANONYMIZATION defaults to false (self-only).
"""

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SETTING = "ENABLE_DATA_ANONYMIZATION"


def _registry_manifest_default() -> str:
    manifest = json.loads((REPO_ROOT / "server.json").read_text())

    found = []

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key == SETTING and isinstance(value, dict) and "default" in value:
                    found.append(str(value["default"]))
                if key == "name" and value == SETTING and "default" in node:
                    found.append(str(node["default"]))
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(manifest)
    assert found, f"{SETTING} has no declared default in server.json"
    assert len(set(found)) == 1, f"server.json declares conflicting defaults: {found}"
    return found[0].strip().lower()


def _code_default() -> bool:
    import os
    from unittest.mock import patch

    from canvas_mcp.core import config as config_module

    with patch.dict(os.environ, {}, clear=True):
        config_module.reset_config()
        value = config_module._bool_env(SETTING, False)
    config_module.reset_config()
    return value


def _dockerfile_default() -> str:
    text = (REPO_ROOT / "Dockerfile").read_text()
    matches = re.findall(rf'^\s*{SETTING}="?([A-Za-z]+)"?', text, re.MULTILINE)
    assert matches, f"{SETTING} is not set in the Dockerfile"
    return matches[-1].strip().lower()


def _env_template_default() -> str:
    text = (REPO_ROOT / "env.template").read_text()
    matches = re.findall(rf"^{SETTING}=(\S+)", text, re.MULTILINE)
    assert matches, f"{SETTING} is not set in env.template"
    return matches[-1].strip().lower()


class TestPrivacyDefaultConsistency:
    def test_all_channels_declare_the_same_default(self):
        code = "true" if _code_default() else "false"
        channels = {
            "code (core/config.py)": code,
            "MCP Registry (server.json)": _registry_manifest_default(),
            "container (Dockerfile)": _dockerfile_default(),
            "operator template (env.template)": _env_template_default(),
        }

        distinct = set(channels.values())
        assert len(distinct) == 1, (
            f"{SETTING} defaults disagree across distribution channels: {channels}. "
            "A privacy default must be changed in all of them together."
        )

    def test_the_agreed_default_is_self_only_student_fork(self):
        assert _code_default() is False, (
            f"{SETTING} defaults to off in the Jacob IBE student fork."
        )

    @pytest.mark.parametrize(
        "reader",
        [_registry_manifest_default, _dockerfile_default, _env_template_default],
        ids=["server.json", "Dockerfile", "env.template"],
    )
    def test_each_channel_declares_a_parseable_boolean(self, reader):
        assert reader() in {"true", "false"}
