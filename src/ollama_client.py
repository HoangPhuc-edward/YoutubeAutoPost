import os
import requests
from typing import Optional, Dict, Any

class OllamaClient:
    def __init__(self, model: str = "qwen2.5:7b", host: str = None, timeout: int = 1200):
        # uu tien host truyen vao, neu khong lay tu bien moi truong, cuoi cung la localhost
        env_host = os.getenv('OLLAMA_HOST', 'localhost:11434')
        self.host = host or env_host
        
        if not self.host.startswith('http'):
            self.host = f"http://{self.host}"
            
        self.base_url = self.host.rstrip('/')
        self.model = model
        self.timeout = timeout

    def check_connection(self) -> bool:
        """Kiem tra ket noi va model"""
        try:
            url = f"{self.base_url}/api/tags"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                models = [m.get('name') for m in response.json().get('models', [])]
                if self.model in models:
                    print(f"Ollama san sang. Model: {self.model}")
                    return True
                else:
                    print(f"Ket noi thanh cong nhung chua co model: {self.model}")
                    print(f"Vui long chay: ollama pull {self.model}")
                    return False
            return False
            
        except requests.exceptions.RequestException:
            print(f"Khong the ket noi toi Ollama tai {self.base_url}")
            return False

    def send_prompt(self, prompt: str, system: str = "", options: Dict[str, Any] = None) -> Optional[str]:
        """Gui prompt va nhan ket qua"""
        url = f"{self.base_url}/api/generate"
        
        # Cau hinh mac dinh
        default_options = {
            "temperature": 0.3,
            "num_ctx": 2048,      
            "num_predict": 600,                  
            "num_thread": 4,      
            "repeat_penalty": 1.2 
        }
        
        if options:
            default_options.update(options)

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": default_options
        }

        try:
            print("Dang gui yeu cau xu ly...")
            print(f"-> Dang gui Prompt dai: {len(prompt)} ky tu...")
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            
            result = response.json()
            return result.get('response', '').strip()

        except requests.exceptions.Timeout:
            print(f"Yeu cau bi qua thoi gian ({self.timeout}s)")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Loi API: {e}")
            return None

# --- Huong dan su dung ---
if __name__ == "__main__":
    # Khoi tao
    client = OllamaClient(model="qwen2.5:1.5b")

    # Kiem tra
    if client.check_connection():
        # Gui yeu cau
        prompt = "Cây lúa là gì?"
        result = client.send_prompt(prompt)
        
        if result:
            print("--- Ket qua ---")
            print(result)