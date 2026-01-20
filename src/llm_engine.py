import os
from sqlalchemy.orm import Session
from openai import OpenAI
import requests
import json

# Import DB để lấy cấu hình
from database import SessionLocal, LLMConfig

class LLMManager:
    def __init__(self):
        pass

    def _get_active_config(self):
        """Lấy cấu hình đang được kích hoạt từ DB"""
        db = SessionLocal()
        try:
            config = db.query(LLMConfig).filter(LLMConfig.is_active == True).first()
            return config
        finally:
            db.close()

    def send_prompt(self, prompt: str, options: dict = None) -> str:
        """Hàm chung để gửi prompt, tự động chọn Local hay API"""
        config = self._get_active_config()
        
        # Mặc định nếu chưa cấu hình gì thì fallback về Ollama Local cứng
        if not config:
            print("[WARN] Chưa có cấu hình Active, dùng Ollama mặc định.")
            return self._call_ollama_raw("qwen2.5:3b", "http://localhost:11434", prompt, options)

        print(f"--- Đang dùng Model: {config.name} ({config.model_name}) ---")
        
        if config.provider == "openai":
            return self._call_openai_compatible(config, prompt, options)
        elif config.provider == "ollama":
            return self._call_ollama_raw(config.model_name, config.base_url, prompt, options)
        else:
            return "Lỗi: Provider không hợp lệ."

    def _call_openai_compatible(self, config, prompt: str, options: dict) -> str:
        """Gọi Groq, DeepSeek, OpenAI..."""
        try:
            client = OpenAI(
                base_url=config.base_url,
                api_key=config.api_key
            )
            
            # Mapping tham số tùy chỉnh
            temp = options.get("temperature", 0.2) if options else 0.2
            
            response = client.chat.completions.create(
                model=config.model_name,
                messages=[
                    {"role": "system", "content": "Bạn là trợ lý AI hữu ích, trả lời bằng Tiếng Việt."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temp,
                max_tokens=6000, 
                top_p=0.9,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Lỗi API OpenAI/Groq: {e}")
            return f"Lỗi gọi API: {str(e)}"

    def _call_ollama_raw(self, model_name, base_url, prompt: str, options: dict) -> str:
        """Gọi Ollama Local (dự phòng)"""
        try:
            url = f"{base_url}/api/generate"
            payload = {
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": options or {}
            }
            res = requests.post(url, json=payload)
            if res.status_code == 200:
                return res.json().get("response", "")
            return f"Lỗi Ollama: {res.text}"
        except Exception as e:
            print(f"Lỗi kết nối Ollama: {e}")
            return ""

    # Hàm test kết nối dùng cho nút "Test Connection" ở Frontend
    def test_connection(self, provider, base_url, api_key, model_name):
        try:
            if provider == "openai":
                client = OpenAI(base_url=base_url, api_key=api_key)
                res = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=5
                )
                return True, "Kết nối thành công! Trả lời: " + res.choices[0].message.content
            elif provider == "ollama":
                # Test Ollama đơn giản
                requests.get(base_url)
                return True, "Kết nối Ollama thành công!"
        except Exception as e:
            return False, str(e)