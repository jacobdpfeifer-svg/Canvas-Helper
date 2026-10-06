"""
Canvas MCP Server — Kairos local-first student platform.

Student-only stdio MCP server.
"""

__version__ = "1.11.0"
__author__ = "Kairos; upstream canvas-mcp (Vishal Sachdev)"
__email__ = ""
__description__ = "Local-first student Canvas MCP (Kairos)"

from .server import main

__all__ = ["main", "__version__"]
