"""Deterministic concept diagrams (matplotlib) for math/spatial topics.

Requires the optional ``diagrams`` extra::

    uv pip install -e '.[diagrams]'

Renderers take **precomputed numeric params only** — no expression sandbox,
no sympy. Same params always produce the same PNG (stable hash in the
filename). Generative image APIs are out of scope here; geometric
correctness is the point.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

_MATPLOTLIB_HINT = (
    "matplotlib/numpy required for concept diagrams. "
    "Install with: uv pip install -e '.[diagrams]'"
)


def _require_matplotlib() -> tuple[Any, Any]:
    """Import matplotlib (Agg) + numpy, or raise a clear InstallError."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError as exc:
        raise ImportError(_MATPLOTLIB_HINT) from exc
    return plt, np


class UnknownConceptError(KeyError):
    """Raised when ``concept_key`` is not in the diagram registry."""


def _as_float(params: dict[str, Any], key: str, default: float) -> float:
    value = params.get(key, default)
    return float(value)


def _curve_points(
    np: Any,
    xs: Any | None = None,
    ys: Any | None = None,
    *,
    x_min: float = -1.0,
    x_max: float = 4.0,
    a: float = 0.25,
    b: float = 0.0,
    c: float = 1.0,
) -> tuple[Any, Any]:
    """Sample y = a*x^2 + b*x + c unless explicit xs/ys lists are provided."""
    if xs is not None and ys is not None:
        return np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    x = np.linspace(x_min, x_max, 200)
    y = a * x**2 + b * x + c
    return x, y


def _render_tangent_line(params: dict[str, Any]) -> Any:
    plt, np = _require_matplotlib()
    x0 = _as_float(params, "x0", 2.0)
    y0 = _as_float(params, "y0", 2.0)
    m = _as_float(params, "m", 1.0)
    a = _as_float(params, "a", 0.25)
    b = _as_float(params, "b", 0.0)
    c = _as_float(params, "c", 1.0)
    x_min = _as_float(params, "x_min", -0.5)
    x_max = _as_float(params, "x_max", 4.0)

    x, y = _curve_points(
        np,
        params.get("xs"),
        params.get("ys"),
        x_min=x_min,
        x_max=x_max,
        a=a,
        b=b,
        c=c,
    )

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(x, y, color="#1a5f7a", linewidth=2, label="f(x)")
    t_pad = 1.2
    tx = np.array([x0 - t_pad, x0 + t_pad])
    ty = y0 + m * (tx - x0)
    ax.plot(tx, ty, color="#c45c26", linewidth=2, label="tangent")
    ax.scatter([x0], [y0], color="#c45c26", zorder=5)
    ax.annotate(
        f"({x0:g}, {y0:g})",
        (x0, y0),
        textcoords="offset points",
        xytext=(8, 8),
        fontsize=9,
    )
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title(f"Tangent line at x = {x0:g}")
    ax.axhline(0, color="#888", linewidth=0.6)
    ax.axvline(0, color="#888", linewidth=0.6)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="best", fontsize=9)
    fig.tight_layout()
    return fig


def _render_derivative_slope(params: dict[str, Any]) -> Any:
    plt, np = _require_matplotlib()
    x0 = _as_float(params, "x0", 2.0)
    y0 = _as_float(params, "y0", 2.0)
    m = _as_float(params, "m", 1.0)
    run = _as_float(params, "run", 1.0)
    a = _as_float(params, "a", 0.25)
    b = _as_float(params, "b", 0.0)
    c = _as_float(params, "c", 1.0)
    x_min = _as_float(params, "x_min", -0.5)
    x_max = _as_float(params, "x_max", 4.0)

    x, y = _curve_points(
        np,
        params.get("xs"),
        params.get("ys"),
        x_min=x_min,
        x_max=x_max,
        a=a,
        b=b,
        c=c,
    )
    rise = m * run
    x1, y1 = x0 + run, y0 + rise

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(x, y, color="#1a5f7a", linewidth=2, label="f(x)")
    t_pad = 1.4
    tx = np.array([x0 - t_pad, x0 + t_pad])
    ty = y0 + m * (tx - x0)
    ax.plot(tx, ty, color="#c45c26", linewidth=2, label="tangent")
    # Rise/run right triangle on the tangent
    ax.plot([x0, x1], [y0, y0], color="#2d6a4f", linewidth=1.8)
    ax.plot([x1, x1], [y0, y1], color="#2d6a4f", linewidth=1.8)
    ax.annotate("run", ((x0 + x1) / 2, y0), textcoords="offset points", xytext=(0, -14), fontsize=9, ha="center")
    ax.annotate("rise", (x1, (y0 + y1) / 2), textcoords="offset points", xytext=(8, 0), fontsize=9, va="center")
    ax.scatter([x0], [y0], color="#c45c26", zorder=5)
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title(f"Derivative as slope  f'({x0:g}) = {m:g}")
    ax.axhline(0, color="#888", linewidth=0.6)
    ax.axvline(0, color="#888", linewidth=0.6)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="best", fontsize=9)
    fig.tight_layout()
    return fig


def _render_secant_vs_tangent(params: dict[str, Any]) -> Any:
    plt, np = _require_matplotlib()
    x0 = _as_float(params, "x0", 2.0)
    y0 = _as_float(params, "y0", 2.0)
    m = _as_float(params, "m", 1.0)
    h = _as_float(params, "h", 1.0)
    a = _as_float(params, "a", 0.25)
    b = _as_float(params, "b", 0.0)
    c = _as_float(params, "c", 1.0)
    x_min = _as_float(params, "x_min", -0.5)
    x_max = _as_float(params, "x_max", 4.5)

    # Prefer closed-form quadratic for the second point unless y1 given
    if "y1" in params:
        y1 = _as_float(params, "y1", y0 + m * h)
    else:
        x1 = x0 + h
        y1 = a * x1**2 + b * x1 + c
    x1 = x0 + h
    secant_m = (y1 - y0) / h if h != 0 else m

    x, y = _curve_points(
        np,
        params.get("xs"),
        params.get("ys"),
        x_min=x_min,
        x_max=x_max,
        a=a,
        b=b,
        c=c,
    )

    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(x, y, color="#1a5f7a", linewidth=2, label="f(x)")
    t_pad = 1.5
    tx = np.array([x0 - t_pad, x0 + t_pad])
    ty = y0 + m * (tx - x0)
    ax.plot(tx, ty, color="#c45c26", linewidth=2, linestyle="--", label="tangent")
    sx = np.array([x0 - 0.3, x1 + 0.3])
    sy = y0 + secant_m * (sx - x0)
    ax.plot(sx, sy, color="#6a4c93", linewidth=2, label=f"secant (h={h:g})")
    ax.scatter([x0, x1], [y0, y1], color="#6a4c93", zorder=5)
    ax.annotate(f"x₀", (x0, y0), textcoords="offset points", xytext=(-18, 8), fontsize=9)
    ax.annotate(f"x₀+h", (x1, y1), textcoords="offset points", xytext=(6, 8), fontsize=9)
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title("Secant approaching the tangent as h → 0")
    ax.axhline(0, color="#888", linewidth=0.6)
    ax.axvline(0, color="#888", linewidth=0.6)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="best", fontsize=9)
    fig.tight_layout()
    return fig


def _render_chain_rule_composition(params: dict[str, Any]) -> Any:
    plt, np = _require_matplotlib()
    # Inner u = g(x) = px + q; outer y = f(u) = r*u^2 + s (defaults)
    p = _as_float(params, "p", 0.8)
    q = _as_float(params, "q", 0.5)
    r = _as_float(params, "r", 0.35)
    s = _as_float(params, "s", 0.2)
    x_min = _as_float(params, "x_min", -1.0)
    x_max = _as_float(params, "x_max", 3.0)
    x0 = _as_float(params, "x0", 1.5)

    x = np.linspace(x_min, x_max, 200)
    u = p * x + q
    y_comp = r * u**2 + s
    u0 = p * x0 + q
    y0 = r * u0**2 + s

    fig, axes = plt.subplots(1, 2, figsize=(8, 3.5))

    ax0 = axes[0]
    ax0.plot(x, u, color="#1a5f7a", linewidth=2)
    ax0.scatter([x0], [u0], color="#c45c26", zorder=5)
    ax0.annotate(f"g({x0:g})", (x0, u0), textcoords="offset points", xytext=(6, 6), fontsize=9)
    ax0.set_xlabel("x")
    ax0.set_ylabel("u = g(x)")
    ax0.set_title("Inner: u = g(x)")
    ax0.axhline(0, color="#888", linewidth=0.5)
    ax0.axvline(0, color="#888", linewidth=0.5)
    ax0.grid(True, alpha=0.3)

    ax1 = axes[1]
    u_line = np.linspace(float(u.min()), float(u.max()), 200)
    y_outer = r * u_line**2 + s
    ax1.plot(u_line, y_outer, color="#2d6a4f", linewidth=2)
    ax1.scatter([u0], [y0], color="#c45c26", zorder=5)
    ax1.annotate(f"f(g({x0:g}))", (u0, y0), textcoords="offset points", xytext=(6, 6), fontsize=9)
    ax1.set_xlabel("u")
    ax1.set_ylabel("y = f(u)")
    ax1.set_title("Outer: y = f(u)")
    ax1.axhline(0, color="#888", linewidth=0.5)
    ax1.axvline(0, color="#888", linewidth=0.5)
    ax1.grid(True, alpha=0.3)

    fig.suptitle("Chain rule: (f ∘ g)'(x) = f'(g(x)) · g'(x)", fontsize=11)
    fig.tight_layout()
    return fig


CONCEPT_RENDERERS: dict[str, Callable[[dict[str, Any]], Any]] = {
    "tangent_line": _render_tangent_line,
    "derivative_slope": _render_derivative_slope,
    "secant_vs_tangent": _render_secant_vs_tangent,
    "chain_rule_composition": _render_chain_rule_composition,
}

DEFAULT_PARAMS: dict[str, dict[str, float]] = {
    "tangent_line": {"x0": 2.0, "y0": 2.0, "m": 1.0, "a": 0.25, "b": 0.0, "c": 1.0},
    "derivative_slope": {
        "x0": 2.0,
        "y0": 2.0,
        "m": 1.0,
        "run": 1.0,
        "a": 0.25,
        "b": 0.0,
        "c": 1.0,
    },
    "secant_vs_tangent": {
        "x0": 2.0,
        "y0": 2.0,
        "m": 1.0,
        "h": 1.0,
        "a": 0.25,
        "b": 0.0,
        "c": 1.0,
    },
    "chain_rule_composition": {
        "p": 0.8,
        "q": 0.5,
        "r": 0.35,
        "s": 0.2,
        "x0": 1.5,
    },
}


def list_concept_keys() -> list[str]:
    """Return registered concept keys (sorted)."""
    return sorted(CONCEPT_RENDERERS)


def params_hash(params: dict[str, Any]) -> str:
    """Stable short hash of params for deterministic filenames."""
    payload = json.dumps(params, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:8]


def resolve_output_path(
    concept_key: str,
    params: dict[str, Any],
    *,
    out_path: Path | None = None,
    user_root: Path | None = None,
) -> Path:
    """Resolve where the PNG should be written."""
    if out_path is not None:
        return Path(out_path)
    if user_root is None:
        raise ValueError("Provide out_path or user_root for diagram output")
    out_dir = Path(user_root) / "inbox" / "captures" / "diagrams"
    return out_dir / f"{concept_key}-{params_hash(params)}.png"


def render_concept_diagram(
    concept_key: str,
    params: dict[str, Any] | None = None,
    *,
    out_path: Path | None = None,
    user_root: Path | None = None,
) -> Path:
    """Render a registered concept to PNG and return the path.

    Args:
        concept_key: Key in :data:`CONCEPT_RENDERERS`.
        params: Numeric render parameters (merged over defaults).
        out_path: Explicit PNG path. If omitted, writes under
            ``{user_root}/inbox/captures/diagrams/{concept}-{hash}.png``.
        user_root: Student data root used when ``out_path`` is omitted.

    Returns:
        Path to the written PNG.

    Raises:
        UnknownConceptError: Unknown ``concept_key``.
        ImportError: matplotlib/numpy not installed.
        ValueError: Neither ``out_path`` nor ``user_root`` given.
    """
    if concept_key not in CONCEPT_RENDERERS:
        known = ", ".join(list_concept_keys()) or "(none)"
        raise UnknownConceptError(
            f"Unknown concept key {concept_key!r}. Known: {known}"
        )

    merged: dict[str, Any] = dict(DEFAULT_PARAMS.get(concept_key, {}))
    if params:
        merged.update(params)

    dest = resolve_output_path(
        concept_key, merged, out_path=out_path, user_root=user_root
    )
    dest.parent.mkdir(parents=True, exist_ok=True)

    renderer = CONCEPT_RENDERERS[concept_key]
    fig = renderer(merged)
    try:
        fig.savefig(dest, dpi=120, bbox_inches="tight")
    finally:
        plt, _ = _require_matplotlib()
        plt.close(fig)

    return dest
