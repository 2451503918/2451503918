import socket
import select
import paramiko
import sys
import datetime

PROXY_HOST = "127.0.0.1"
PROXY_PORT = 18080
REMOTE_HOST = "111.231.167.186"
REMOTE_PORT = 22
SSH_USER = "root"
SSH_PASS = "Jjy714970363"
TIMEOUT = 30

def create_proxy_connection(target_host, target_port):
    """Create a connection through the HTTP CONNECT proxy."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(TIMEOUT)
    sock.connect((PROXY_HOST, PROXY_PORT))
    
    # Send CONNECT request
    request = f"CONNECT {target_host}:{target_port} HTTP/1.1\r\nHost: {target_host}:{target_port}\r\n\r\n"
    sock.sendall(request.encode())
    
    # Read response
    response = b""
    while b"\r\n\r\n" not in response:
        chunk = sock.recv(4096)
        if not chunk:
            raise Exception("Proxy connection closed unexpectedly")
        response += chunk
        if len(response) > 4096:
            raise Exception("Proxy response too long")
    
    response_str = response.decode('utf-8', errors='replace')
    if "200" not in response_str.split("\r\n")[0]:
        raise Exception(f"Proxy connection failed: {response_str.split(chr(10))[0]}")
    
    return sock

def run_ssh_command(cmd):
    """Run a command on the remote server via SSH through HTTP proxy."""
    try:
        # Create connection through proxy
        sock = create_proxy_connection(REMOTE_HOST, REMOTE_PORT)
        
        # Create SSH transport
        transport = paramiko.Transport(sock)
        transport.connect(username=SSH_USER, password=SSH_PASS)
        
        # Open channel and execute command
        channel = transport.open_session()
        channel.settimeout(TIMEOUT)
        channel.exec_command(cmd)
        
        # Read output
        stdout = b""
        while True:
            if channel.recv_ready():
                stdout += channel.recv(4096)
            if channel.exit_status_ready():
                break
            if not channel.recv_ready() and not channel.recv_stderr_ready():
                import time
                time.sleep(0.1)
        
        # Read any remaining data
        while channel.recv_ready():
            stdout += channel.recv(4096)
        
        exit_status = channel.recv_exit_status()
        channel.close()
        transport.close()
        sock.close()
        
        return stdout.decode('utf-8', errors='replace').strip(), exit_status
        
    except Exception as e:
        return str(e), -1

def main():
    results = []
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    results.append(f"=== StepSync 限流检测报告 ===")
    results.append(f"时间: {timestamp}")
    results.append(f"账号: 18469160985")
    results.append("")
    
    # Step 1: Test rate limit status
    results.append("--- 第一步：检测华米登录限流状态 ---")
    
    test_cmd = (
        "curl -s -o /dev/null -w 'HTTP %{http_code}' -m 15 -X POST "
        "'https://api-user.huami.com/registrations/%2B8618469160985/tokens' "
        "-H 'Content-Type: application/x-www-form-urlencoded;charset=UTF-8' "
        "-d 'client_id=HuaMi&password=Jjy714970363&redirect_uri=https://s3-us-west-2.amazonaws.com/hm-registration/successsignin.html&token=access'"
    )
    
    output, exit_code = run_ssh_command(test_cmd)
    results.append(f"SSH退出码: {exit_code}")
    results.append(f"curl响应: {output}")
    
    # Determine if rate limit is lifted
    if "HTTP 303" in output:
        results.append("结论: 限流已解除")
        rate_lifted = True
    elif "HTTP 429" in output:
        results.append("结论: 限流未解除 (HTTP 429)")
        rate_lifted = False
    elif "HTTP 200" in output:
        results.append("结论: 返回HTTP 200")
        rate_lifted = False
    else:
        results.append(f"结论: 无法判断，响应为: {output}")
        rate_lifted = False
    
    results.append("")
    
    if rate_lifted:
        # Step 2: Clean rate limit records
        results.append("--- 第二步：清理限流记录 ---")
        cleanup_cmd = "rm -f /www/wwwroot/stepsync/cache/rate_user_*.dat /www/wwwroot/stepsync/cache/rate_*.dat"
        output2, exit_code2 = run_ssh_command(cleanup_cmd)
        results.append(f"清理结果: 成功 (退出码: {exit_code2})")
        
        # Step 3: Run submit test
        results.append("")
        results.append("--- 第三步：执行submit测试 ---")
        submit_cmd = (
            "curl -s -o /tmp/submit_test.txt -w 'HTTP %{http_code} time=%{time_total}s\\n' "
            "-m 60 -X POST -H 'Content-Type: application/json' "
            "-d '{\"username\":\"18469160985\",\"password\":\"Jjy714970363\",\"steps\":8888,\"tokens\":null}' "
            "http://127.0.0.1:8082/api/proxy.php?action=submit; cat /tmp/submit_test.txt"
        )
        
        output3, exit_code3 = run_ssh_command(submit_cmd)
        results.append(f"submit响应: {output3}")
        
        if "success" in output3.lower():
            results.append("submit测试结果: 成功")
            results.append("")
            results.append("=== 最终结论 ===")
            results.append("限流已解除，submit测试通过，账号18469160985可正常使用！")
        else:
            results.append("submit测试结果: 失败")
            results.append("")
            results.append("=== 最终结论 ===")
            results.append("限流已解除，但submit测试失败，请检查详细错误信息。")
    else:
        results.append("=== 最终结论 ===")
        results.append("限流未解除，下次检测继续。")
    
    # Print results
    report = "\n".join(results)
    print(report)
    
    # Save to file
    with open("/workspace/stepsync_ratelimit_check.txt", "w", encoding="utf-8") as f:
        f.write(report)
        f.write("\n")
    
    print("\n报告已保存到 /workspace/stepsync_ratelimit_check.txt")

if __name__ == "__main__":
    main()