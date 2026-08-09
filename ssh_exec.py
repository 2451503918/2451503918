#!/usr/bin/env python3
import sys
import socket
import paramiko

HOST = '111.231.167.186'
PORT = 22
USER = 'root'
PASS = 'Jjy714970363'
PROXY_HOST = '127.0.0.1'
PROXY_PORT = 18080


def make_proxy_sock():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(20)
    s.connect((PROXY_HOST, PROXY_PORT))
    connect_req = (
        f"CONNECT {HOST}:{PORT} HTTP/1.1\r\n"
        f"Host: {HOST}:{PORT}\r\n"
        f"\r\n"
    ).encode()
    s.sendall(connect_req)
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            raise RuntimeError("proxy closed connection during CONNECT")
        buf += chunk
    head = buf.split(b"\r\n\r\n", 1)[0].decode(errors="replace")
    first = head.splitlines()[0] if head else ""
    if "200" not in first:
        raise RuntimeError(f"proxy CONNECT failed: {first}")
    return s


def run_remote(cmd):
    sock = make_proxy_sock()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS,
                   sock=sock, timeout=20, allow_agent=False, look_for_keys=False)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc = stdout.channel.recv_exit_status()
    client.close()
    sock.close()
    return rc, out, err


def main():
    if len(sys.argv) < 2:
        print("usage: ssh_exec.py <remote_command>")
        sys.exit(2)
    cmd = sys.argv[1]
    try:
        rc, out, err = run_remote(cmd)
    except Exception as e:
        sys.stderr.write(f"SSH_ERROR: {e}\n")
        sys.exit(127)
    sys.stdout.write(out)
    sys.stderr.write(err)
    sys.exit(rc)


if __name__ == "__main__":
    main()
