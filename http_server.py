from http.server import HTTPServer, SimpleHTTPRequestHandler

server_address = ('localhost', 8000)
httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
print("서버 실행 중: http://localhost:8000")
httpd.serve_forever()