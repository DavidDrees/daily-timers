"""Local dev server for daily-timers that disables all caching.

`python -m http.server` lets browsers cache aggressively, which fights
iterative development (edits look stale until a hard, manual cache-bust).
This wrapper just adds `Cache-Control: no-store` to every response so a
normal reload always reflects what's on disk. Not used in production —
the deployed (GitHub Pages) version relies on the service worker's
versioned cache instead, which is what real visitors get.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090

# Serve this script's own directory regardless of the caller's cwd.
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=PORT)
