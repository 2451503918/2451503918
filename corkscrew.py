#!/usr/bin/env python3
"""Simple corkscrew replacement for HTTP CONNECT proxy tunneling."""
import socket
import sys
import select
import os

if len(sys.argv) < 4:
    print(f"Usage: {sys.argv[0]} <proxy_host> <proxy_port> <target_host> <target_port>", file=sys.stderr)
    sys.exit(1)

proxy_host = sys.argv[1]
proxy_port = int(sys.argv[2])
target_host = sys.argv[3]
target_port = int(sys.argv[4]) if len(sys.argv) > 4 else int(sys.argv[3])

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(15)
sock.connect((proxy_host, proxy_port))
sock.settimeout(None)

connect_req = f'CONNECT {target_host}:{target_port} HTTP/1.0\r\nHost: {target_host}:{target_port}\r\n\r\n'
sock.sendall(connect_req.encode())

response = b''
while b'\r\n\r\n' not in response:
    chunk = sock.recv(4096)
    if not chunk:
        print('Connection failed', file=sys.stderr)
        sys.exit(1)
    response += chunk

status_line = response.split(b'\r\n')[0].decode()
if '200' not in status_line:
    print(f'Proxy error: {status_line}', file=sys.stderr)
    sys.exit(1)

# Relay between stdin/stdout and the socket
stdin_fd = sys.stdin.fileno()
stdout_fd = sys.stdout.fileno()

while True:
    r, _, _ = select.select([stdin_fd, sock], [], [], 30)
    if not r:
        break
    if stdin_fd in r:
        data = os.read(stdin_fd, 65536)
        if not data:
            break
        sock.sendall(data)
    if sock in r:
        data = sock.recv(65536)
        if not data:
            break
        os.write(stdout_fd, data)

sock.close()
