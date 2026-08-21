"""
Canvas MCP Server — Jacob IBE personal student fork (CU Boulder).

Student-only stdio MCP server. Not the upstream multi-audience product.
"""

__version__ = "1.11.0"
__author__ = "Jacob Pfeifer (fork); upstream Vishal Sachdev"
__email__ = ""
__description__ = "Personal student Canvas MCP for CU Boulder IBE"

from .server import main

__all__ = ["main", "__version__"]
