# Chrome extension (MV3)

Sensors only: Canvas tab focus/URL → Native Messaging host `com.productname.daemon`.

**No direct Canvas writes.** The daemon issues MCP tool calls using its own
Playwright persistent-context profile. The extension does not share cookies
with the daemon.

## Pair with Native Messaging host

See [`../native-messaging/README.md`](../native-messaging/README.md). After
loading this extension unpacked, install the host with your extension ID:

```bash
PRODUCTNAME_EXTENSION_ID=<id> bash ../native-messaging/install-macos.sh
```
