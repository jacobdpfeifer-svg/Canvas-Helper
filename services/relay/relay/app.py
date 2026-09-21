"""HTTP surface (stdlib). Put TLS termination and rate limiting in front of it."""

from __future__ import annotations

import json
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .config import MAX_BODY_BYTES, Config, inference_allowance_cents
from .log import log
from .service import RelayService
from .store import RelayError, Store


def make_handler(service: RelayService, config: Config) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        server_version = "study-relay/0.1"

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 - http.server API
            return  # access logs would contain paths/ids only, but keep the single logger

        def _send(self, status: int, body: dict[str, Any]) -> None:
            data = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def _body(self) -> Any:
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY_BYTES:
                raise RelayError("too_large", "body too large", 413)
            if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
                raise RelayError("validation", "content-type must be application/json", 415)
            raw = self.rfile.read(length)
            try:
                return json.loads(raw.decode("utf-8") or "{}")
            except ValueError as exc:
                raise RelayError("validation", "body is not JSON") from exc

        def _bearer(self) -> str:
            auth = self.headers.get("Authorization") or ""
            if not auth.startswith("Bearer "):
                raise RelayError("unauthorized", "missing bearer token", 401)
            return auth[7:].strip()

        def _admin(self) -> None:
            token = self._bearer()
            if not config.admin_token or not secrets.compare_digest(token, config.admin_token):
                raise RelayError("unauthorized", "admin token required", 401)

        def do_GET(self) -> None:  # noqa: N802
            try:
                if self.path == "/v1/usage":
                    tester = service.authenticate(self._bearer())
                    self._send(200, service.usage(tester))
                elif self.path.startswith("/v1/status/"):
                    tester = service.authenticate(self._bearer())
                    self._send(200, service.status(tester, self.path.rsplit("/", 1)[1]))
                elif self.path == "/admin/budget":
                    self._admin()
                    self._send(200, service.admin_budget())
                elif self.path == "/healthz":
                    self._send(200, {"ok": True})
                else:
                    self._send(404, {"ok": False, "error": {"code": "not_found", "message": "unknown path"}})
            except RelayError as exc:
                self._send(exc.http_status, {"ok": False, "error": {"code": exc.code, "message": exc.message}})

        def do_POST(self) -> None:  # noqa: N802
            try:
                if self.path == "/v1/invite/redeem":
                    body = self._body()
                    self._send(200, service.redeem(str((body or {}).get("code") or "")))
                elif self.path == "/v1/study":
                    tester = service.authenticate(self._bearer())
                    body = self._body()
                    self._send(200, service.study(tester, body))
                elif self.path == "/admin/invites":
                    self._admin()
                    body = self._body()
                    self._send(200, service.admin_invite(str(body.get("label") or "tester"), body.get("allowance_cents")))
                elif self.path == "/admin/revoke":
                    self._admin()
                    body = self._body()
                    self._send(200, service.admin_revoke(str(body.get("tester_id") or "")))
                else:
                    self._send(404, {"ok": False, "error": {"code": "not_found", "message": "unknown path"}})
            except RelayError as exc:
                self._send(exc.http_status, {"ok": False, "error": {"code": exc.code, "message": exc.message}})
            except Exception as exc:  # noqa: BLE001 - never leak a traceback body
                log("internal_error", code=type(exc).__name__)
                self._send(500, {"ok": False, "error": {"code": "internal", "message": "internal error"}})

    return Handler


def serve(config: Config | None = None) -> None:
    config = config or Config()
    store = Store(config.db_path, global_allowance_cents=inference_allowance_cents(config))
    service = RelayService(config, store)
    server = ThreadingHTTPServer((config.host, config.port), make_handler(service, config))
    log("relay_started", http_status=config.port)
    server.serve_forever()


if __name__ == "__main__":
    serve()
