# Optional local container for the Jacob IBE student fork (stdio).
# Prefer bare `uv run canvas-mcp-server` on your machine.

FROM python:3.14-slim@sha256:a7fb1e634c4a578f9e0bd6327f11a3cde11b7a9395f48e24360c0988bcc5c2bc

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY LICENSE ./
COPY README.md ./
COPY env.template ./
COPY src/ ./src/

RUN uv pip install --system --no-cache -e .

RUN adduser --disabled-password --gecos '' mcp && \
    chown -R mcp:mcp /app

ENV MCP_SERVER_NAME="jacob-canvas-ibe" \
    ENABLE_DATA_ANONYMIZATION="false" \
    ANONYMIZATION_DEBUG="false" \
    CANVAS_ROLE="student"

USER mcp

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import canvas_mcp; print('OK')" || exit 1

# stdio MCP — pass token/url at run time, e.g.:
# docker run -i --rm -e CANVAS_API_TOKEN -e CANVAS_API_URL=https://canvas.colorado.edu/api/v1 …
CMD ["canvas-mcp-server"]
