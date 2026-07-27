import requests
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
OUTPUT_FILE = os.path.join(PROJECT_ROOT, 'instances.json')
API_URL = "https://status.d420.de/api/v1/instances"

DEFAULT_PRIORITY = 0
INSTANCE_PRIORITY_OVERRIDES = {
    "https://nitter.net": -100,
    "https://nitter.poast.org": 50,
    "https://lightbrd.com": 100,
}

def fetch_and_save():
    print(f"正在从 {API_URL} 获取实例状态...")
    try:
        resp = requests.get(API_URL, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        
        hosts = data.get('hosts', [])
        # 筛选准则：健康、且不是坏主机
        healthy_hosts = [
            {
                "url": h['url'].rstrip('/'),
                "points": h.get('points', 0)
            }
            for h in hosts 
            if h.get('healthy') and not h.get('is_bad_host')
        ]
        
        # 按分数从高到低排列
        healthy_hosts.sort(key=lambda x: x['points'], reverse=True)
        
        instance_configs = [
            {
                "url": h["url"],
                "priority": INSTANCE_PRIORITY_OVERRIDES.get(h["url"], DEFAULT_PRIORITY),
            }
            for h in healthy_hosts
        ]

        if instance_configs:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(instance_configs, f, indent=2, ensure_ascii=False)
            print(f"成功更新 {len(instance_configs)} 个健康实例到 {OUTPUT_FILE}")
            return True
        else:
            print("未能获取到任何健康实例")
            return False
            
    except Exception as e:
        print(f"获取实例列表异常: {e}")
        return False

if __name__ == "__main__":
    fetch_and_save()
