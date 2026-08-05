#!/usr/bin/env python3
"""
StepSync 自动刷步数脚本
用于 GitHub Actions 定时执行

环境变量：
  ZEPP_USER  - Zepp Life 账号
  ZEPP_PWD   - Zepp Life 密码
  MIN_STEP   - 最小步数（默认 18000）
  MAX_STEP   - 最大步数（默认 25000）
"""

import os
import sys
import uuid
import json
import random
import re
from datetime import datetime
from urllib.parse import urlencode

import requests

API_USER = "https://api-user.huami.com"
API_APP = "https://app-api.huami.com"


def log(msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] {msg}")


def get_device_id():
    return str(uuid.uuid4())


def login(username, password, device_id):
    """第一步：登录获取 access_token"""
    url = f"{API_USER}/registrations/tokens"
    params = {"client_id": "HuaMi"}
    data = {
        "client_id": "HuaMi",
        "password": password,
        "request_id": device_id,
        "redirect_uri": "https://s3.huami.com/oauth2/callback",
        "token": "access",
    }
    r = requests.post(url, params=params, data=data, allow_redirects=False)
    location = r.headers.get("Location", "")
    match = re.search(r"access=([^&]+)", location)
    if match:
        return match.group(1)
    try:
        body = r.json()
        if "access_token" in body:
            return body["access_token"]
    except Exception:
        pass
    log(f"登录失败: status={r.status_code}")
    return None


def get_app_token(access_token, device_id):
    """第二步：获取 app_token"""
    url = f"{API_APP}/v1/client/auth"
    data = {
        "dn": device_id,
        "token": access_token,
        "login_token": "",
        "method": "ali.mini.server.token.apply",
        "source": "com.xiaomi.hm.health",
    }
    r = requests.post(url, data=data)
    body = r.json()
    return body.get("app_token"), body.get("login_token"), body.get("user_id")


def submit_steps(app_token, user_id, steps, device_id):
    """第三步：提交步数"""
    url = f"{API_APP}/v1/data/band_data.json"
    today = datetime.now().strftime("%Y-%m-%d")
    date_time = f"{today} 00:00:00"

    data_payload = json.dumps({
        "data": [{
            "did": device_id,
            "date": date_time,
            "summary": "[]",
            "step": steps,
        }],
        "typeid": 12,
        "userid": user_id,
        "device": {
            "device_id": device_id,
            "device_type": "android",
            "firm_version": "1.0",
            "platform_version": "9",
        },
        "date_time": date_time,
    })

    data = {
        "userid": user_id,
        "device_id": device_id,
        "date_time": date_time,
        "data": data_payload,
        "typeid": "12",
        "request_id": device_id,
        "token": app_token,
        "method": "ali.mini.server.step.save",
    }
    headers = {"Authorization": f"Bearer {app_token}"}
    r = requests.post(url, data=data, headers=headers)
    try:
        body = r.json()
        code = body.get("code", 0)
        msg = body.get("message", "")
        if code == 1 or msg == "success" or r.status_code == 200:
            return True, msg
        return False, msg
    except Exception:
        return r.status_code == 200, r.text[:200]


def main():
    username = os.environ.get("ZEPP_USER", "")
    password = os.environ.get("ZEPP_PWD", "")
    min_step = int(os.environ.get("MIN_STEP", "18000"))
    max_step = int(os.environ.get("MAX_STEP", "25000"))

    if not username or not password:
        log("错误：未设置 ZEPP_USER 或 ZEPP_PWD")
        sys.exit(1)

    steps = random.randint(min_step, max_step)
    steps = min(steps, 98800)
    log(f"目标步数：{steps}")

    device_id = get_device_id()

    log("第一步：登录...")
    access_token = login(username, password, device_id)
    if not access_token:
        log("登录失败，请检查账号密码")
        sys.exit(1)
    log("登录成功")

    log("第二步：获取 token...")
    app_token, login_token, user_id = get_app_token(access_token, device_id)
    if not app_token:
        log("获取 app_token 失败")
        sys.exit(1)
    log(f"获取成功，user_id={user_id}")

    log("第三步：提交步数...")
    ok, msg = submit_steps(app_token, user_id, steps, device_id)
    if ok:
        log(f"提交成功！步数={steps}")
    else:
        log(f"提交失败：{msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()
