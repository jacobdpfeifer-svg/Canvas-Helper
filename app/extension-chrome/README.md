# Chrome extension (MV3)

Sensors only: Canvas tab focus/URL → Native Messaging host `com.productname.daemon`.

**No direct Canvas writes.** The daemon issues MCP tool calls using its own
Playwright persistent-context profile. The extension does not share cookies
with the daemon.
