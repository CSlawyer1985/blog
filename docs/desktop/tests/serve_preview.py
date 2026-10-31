"""Local preview of the static host's clean HTML URLs and same-origin frames."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import os

ROOT = Path(__file__).resolve().parents[3]


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path.endswith('.html') and Path(super().translate_path(url.path)).is_file():
            target = url.path[:-10] if url.path.endswith('index.html') else url.path[:-5]
            self.send_response(302)
            self.send_header('Location', (target or '/') + ('?' + url.query if url.query else ''))
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        translated = super().translate_path(path)
        if not Path(translated).exists() and Path(translated + '.html').is_file():
            return translated + '.html'
        return translated

    def end_headers(self):
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(ROOT)
    ThreadingHTTPServer(('127.0.0.1', 8337), Handler).serve_forever()
