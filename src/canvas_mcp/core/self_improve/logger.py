"""Episodic request logger (feeds clustering + mem0)."""

from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class RequestLog:
    timestamp: float
    intent_tag: str
    tools_used: list[str]
    artifacts_produced: list[str]
    success_signal: str  # accept | veto | timeout | error
    latency_ms: float
    embedding: list[float] | None = None
    transcript_excerpt: str = ""
    meta: dict[str, Any] = field(default_factory=dict)


def _db_path(user_root: Path) -> Path:
    return Path(user_root) / "episodic.db"


def ensure_episodic_db(user_root: Path) -> Path:
    path = _db_path(user_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                intent_tag TEXT NOT NULL,
                tools_used TEXT NOT NULL,
                artifacts_produced TEXT NOT NULL,
                success_signal TEXT NOT NULL,
                latency_ms REAL NOT NULL,
                embedding TEXT,
                transcript_excerpt TEXT,
                meta TEXT
            )
            """
        )
        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_requests_intent ON requests(intent_tag)"
        )
        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(timestamp)"
        )
        con.commit()
    finally:
        con.close()
    return path


def log_request(user_root: Path, entry: RequestLog) -> int:
    ensure_episodic_db(user_root)
    con = sqlite3.connect(_db_path(user_root))
    try:
        cur = con.execute(
            """
            INSERT INTO requests (
                timestamp, intent_tag, tools_used, artifacts_produced,
                success_signal, latency_ms, embedding, transcript_excerpt, meta
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry.timestamp or time.time(),
                entry.intent_tag,
                json.dumps(entry.tools_used),
                json.dumps(entry.artifacts_produced),
                entry.success_signal,
                entry.latency_ms,
                json.dumps(entry.embedding) if entry.embedding is not None else None,
                entry.transcript_excerpt,
                json.dumps(entry.meta),
            ),
        )
        con.commit()
        return int(cur.lastrowid)
    finally:
        con.close()


def recent_requests(user_root: Path, limit: int = 200) -> list[dict[str, Any]]:
    ensure_episodic_db(user_root)
    con = sqlite3.connect(_db_path(user_root))
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(
            "SELECT * FROM requests ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        con.close()
