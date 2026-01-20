import os
import json
import uuid
import re
from typing import List, Dict, Set, Optional

import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from llm_engine import LLMManager
from extractor import Extractor
from ollama_client import OllamaClient

class WikiComposer:
    def __init__(self, base_dir: str = "data_storage"):
        # 1. Cau hinh thu muc
        self.raw_dir = os.path.join(base_dir, "raw")
        self.vector_path = os.path.join(base_dir, "vector_db")
        os.makedirs(self.raw_dir, exist_ok=True)

        # 2. Khoi tao Core
        self.extractor = Extractor(model_size="base")
        #self.llm = OllamaClient(model="qwen2.5:3b")
        self.llm = LLMManager()
        
        print("Dang tai model Embedding...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

        # 3. Khoi tao ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=self.vector_path)
        self.collection = self.chroma_client.get_or_create_collection(name="wiki_docs")

        # 4. Quan ly Source Map (Registry)
        self.source_map_file = os.path.join(base_dir, "source_map.json")
        self.source_registry = self._load_source_registry()
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""]
        )

    # --- QUAN LY NGUON (REGISTRY - LOGIC MOI) ---
    def _load_source_registry(self) -> Dict:
        if os.path.exists(self.source_map_file):
            try:
                with open(self.source_map_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Kiem tra xem co phai format cu khong (neu value la int thi la format cu)
                    if data and isinstance(list(data.values())[0], int):
                        print("Phat hien source_map cu, se reset de dung format moi.")
                        return {}
                    return data
            except Exception:
                return {}
        return {}

    def _save_source_registry(self):
        with open(self.source_map_file, 'w', encoding='utf-8') as f:
            json.dump(self.source_registry, f, ensure_ascii=False, indent=2)

    def clear_source_registry(self):
        """Reset registry."""
        if os.path.exists(self.source_map_file):
            os.remove(self.source_map_file)
        self.source_registry = {}
        print("source_map.json removed; registry reset.")

    # [SỬA ĐỔI] Thêm tham số session_id
    def _get_source_id(self, source_name: str, session_id: str) -> int:
        # Khoi tao dictionary cho session neu chua co
        if session_id not in self.source_registry:
            self.source_registry[session_id] = {}

        # Neu nguon chua co trong session nay, tao ID moi bat dau tu 1
        if source_name not in self.source_registry[session_id]:
            # ID moi = so luong nguon hien tai cua session + 1
            new_id = len(self.source_registry[session_id]) + 1
            self.source_registry[session_id][source_name] = new_id
            self._save_source_registry()
            
        return self.source_registry[session_id][source_name]

    # --- XU LY VECTOR & INPUT ---
    def _prepare_vector_data(self, chunks: List[str], session_id: str, source_id: int):
        ids = []
        metadatas = []
        for i, chunk_text in enumerate(chunks):
            ids.append(str(uuid.uuid4()))
            metadatas.append({
                "doc_name": session_id, 
                "chunk_index": i, 
                "source_id": source_id
            })
        embeddings = self.embedding_model.encode(chunks).tolist()
        return ids, embeddings, metadatas

    def process_input_to_vector(self, input_source: str, input_type: str, session_id: str) -> bool:
        print(f"--- Xu ly cho Session: {session_id} | Nguon: {input_source} ---")
        
        # 1. Trich xuat
        try:
            raw = None
            if input_type == "url": raw = self.extractor.extract_website(input_source)
            elif input_type in ["pdf", "docx"]: raw = self.extractor.extract_text_file(input_source)
            elif input_type == "youtube": raw = self.extractor.extract_youtube(input_source) 
            elif input_type == "audio": raw = self.extractor.extract_mp3(input_source)

            if not raw: 
                print("-> Khong trich xuat duoc noi dung (Empty).")
                return False
        except Exception as e:
            print(f"-> Loi trich xuat: {e}")
            return False

        # 2. Luu file raw backup
        session_raw_dir = os.path.join(self.raw_dir, session_id)
        os.makedirs(session_raw_dir, exist_ok=True)

        # [SỬA ĐỔI] Goi ham lay ID voi session_id
        source_id = self._get_source_id(input_source, session_id)
        
        safe_name = f"source_{source_id}.json"
        with open(os.path.join(session_raw_dir, safe_name), 'w', encoding='utf-8') as f:
            json.dump({"source": input_source, "content": raw}, f, ensure_ascii=False)

        chunks = self.text_splitter.split_text(raw)
        print(f"-> Da chia thanh {len(chunks)} chunks. Source ID: {source_id}")

        # 3. Luu vao Vector DB
        ids, embeddings, metadatas = self._prepare_vector_data(chunks, session_id, source_id)
        self.collection.add(documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids)
        return True

    # --- CAC HAM HELPER ---
    def _clean_output_text(self, text: str, section_title: str) -> str:
        if not text: return ""
        text = text.strip()
        pattern = r'^' + re.escape(section_title) + r'[:.]?\s*'
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        text = text.replace("Văn xuôi:", "").replace("Đoạn văn:", "")
        
        if text and text[-1] not in ['.', '!', '?', '"', '”']:
            last_punct = max(text.rfind('.'), text.rfind('!'), text.rfind('?'))
            if last_punct != -1:
                text = text[:last_punct+1]
        return text.strip()

    def _parse_chroma_results(self, results) -> List[Dict]:
        parsed_data = []
        if results and results['documents']:
            doc_list = results['documents'][0]
            meta_list = results['metadatas'][0]
            for i in range(len(doc_list)):
                parsed_data.append({"content": doc_list[i], "source_id": meta_list[i].get('source_id', 0)})
        return parsed_data

    def _get_relevant_chunks(self, query: str, session_id: str) -> List[Dict]:
        query_vector = self.embedding_model.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=4,
            where={"doc_name": session_id} 
        )
        return self._parse_chroma_results(results)

    def _append_citations_manually(self, text: str, used_ids: Set[int]) -> str:
        if not text or not used_ids: return text
        sorted_ids = sorted(list(used_ids))
        citation_str = ", ".join([f"[{sid}]" for sid in sorted_ids])
        return f"{text}\n\n*(Nguồn tham khảo: {citation_str})*"

    # --- HAM CORE LOGIC ---
    def generate_outline(self, session_id: str, topic_type: str = "science", custom_instruction: Optional[str] = None) -> List[str]:
        results = self.collection.get(where={"doc_name": session_id}, limit=5)
        if not results['documents']: return []
        context = "\n".join(results['documents'])

        if custom_instruction:
            instruction = f"Lập dàn ý theo yêu cầu: {custom_instruction}"
        else:
            templates = {
                "science": "Bài Wiki Khoa học (Gồm: Định nghĩa, Cơ chế, Ứng dụng).",
                "general": "Bài tổng hợp thông tin chung."
            }
            style = templates.get(topic_type, templates["general"])
            instruction = f"Lập Dàn ý chi tiết cho {style}"

        prompt = (
            "Dựa trên nội dung tham khảo sau, hãy " + instruction + "\n"
            "Chỉ liệt kê các mục lớn (I, II, III...). KHÔNG giải thích.\n"
            "Nội dung tham khảo:\n" + context[:2000]
        )
        
        print(f"Dang lap dan y...")
        response = self.llm.send_prompt(prompt, options={"temperature": 0.2})
        if not response: return []
        
        return [l.strip() for l in response.split('\n') if any(c.isdigit() or c in "IVX" for c in l.strip()[:3])]

    def write_section(self, section_title: str, session_id: str) -> (str, List[int]):
        chunks = self._get_relevant_chunks(section_title, session_id)
        context_str = ""
        used_ids = set()
        for c in chunks:
            sid = c.get('source_id', 0)
            context_str += f"--- Nguồn {sid} ---\n{c.get('content','')}\n"
            used_ids.add(sid)

        prompt = (
            f"Nhiệm vụ: Viết mục '{section_title}' của bài Wiki.\n"
            "Dữ liệu tham khảo:\n" + context_str + "\n"
            "Yêu cầu: Chỉ dùng dữ liệu tham khảo. Nếu thiếu, ghi 'Nội dung này chưa được cập nhật trong tài liệu.'\n"
            "Viết bằng tiếng Việt, văn xuôi, không danh sách, không tự điền số trích dẫn."
        )

        raw_text = self.llm.send_prompt(prompt, options={"num_predict": 800, "repeat_penalty": 1.2})
        cleaned_text = self._clean_output_text(raw_text, section_title)

        if cleaned_text and "chưa được cập nhật" in cleaned_text.lower() and len(cleaned_text) < 100:
            return cleaned_text, []

        final_text = self._append_citations_manually(cleaned_text, used_ids)
        return final_text, list(used_ids)

    # [SỬA ĐỔI] Thêm session_id vào đây để lấy đúng map
    def generate_bibliography(self, used_ids_list: List[int], session_id: str = None) -> str:
        """Tao footer tai lieu tham khao"""
        # Lay map rieng cua session nay
        session_map = self.source_registry.get(session_id, {})
        # Dao nguoc map: {1: "url", 2: "file.pdf"}
        id_to_source = {v: k for k, v in session_map.items()}
        
        if not used_ids_list:
            return "\n## DANH SÁCH TÀI LIỆU THAM KHẢO\nChưa có trích dẫn."

        footer = "\n## DANH SÁCH TÀI LIỆU THAM KHẢO\n"
        for sid in sorted(set(used_ids_list)):
            source_url = id_to_source.get(sid, "N/A")
            footer += f"- **[{sid}]**: {source_url}\n"
        return footer

    def compose_wiki(self, doc_name: str, topic_type: str = "science", custom_instruction: Optional[str] = None) -> str:
        # doc_name chinh la session_id
        session_id = doc_name
        outline = self.generate_outline(session_id, topic_type, custom_instruction)
        if not outline: return "Khong the tao dan y."

        full_article = f"# BÀI VIẾT WIKI: {session_id.upper()}\n"
        if custom_instruction:
            full_article += f"*Yêu cầu: {custom_instruction}*\n\n"
        
        all_used_source_ids = set()

        print("\n--- Bat dau viet bai ---")
        for section in outline:
            print(f"Dang viet: {section}")
            content, ids_in_section = self.write_section(section, session_id)
            if not content:
                print(f"-> Khong tim thay thong tin cho muc: {section}")
                continue
            if content:
                full_article += f"## {section}\n{content}\n\n"
                all_used_source_ids.update(ids_in_section)

        # [SỬA ĐỔI] Truyen session_id vao de lay dung link
        full_article += self.generate_bibliography(list(all_used_source_ids), session_id)

        return full_article

    def get_prompt_suggestion(self, session_id: str, n_suggestions: int = 5) -> List[str]:
        results = self.collection.get(where={"doc_name": session_id}, limit=6)
        if not results or not results.get('documents') or not results['documents'][0]:
            return []

        context = "\n---\n".join(results['documents'][0][:6])
        prompt = f'''
            Dựa trên nội dung tham khảo, hãy đề xuất {n_suggestions} câu lệnh (prompt) bằng TIẾNG VIỆT để người dùng yêu cầu AI viết bài.
            Ví dụ: "Tóm tắt nội dung", "Phân tích ưu điểm".
            Nội dung: {context[:2000]}
            '''
        raw = self.llm.send_prompt(prompt, options={"temperature": 0.5})
        if not raw: return []
        
        suggestions = []
        for line in raw.split('\n'):
            text = line.strip().lstrip('-').lstrip('*').strip()
            text = re.sub(r'^\d+\.|^[a-zA-Z]\)|^\d+\)', '', text).strip()
            if text and len(suggestions) < n_suggestions:
                suggestions.append(text)
        return suggestions
    
    def generate_youtube_seo(self, session_id: str, custom_prompt: Optional[str] = None) -> str:
        """
        Viết bài SEO YouTube dưới dạng văn bản liền mạch (Markdown)
        """
        # Lấy nội dung từ Vector DB
        results = self.collection.get(where={"doc_name": session_id}, limit=10)
        if not results['documents']:
            return "Nội dung video chưa được xử lý."
        
        context = "\n".join(results['documents'])

        # Prompt yêu cầu viết liền mạch
        default_instruction = (
            "Bạn là chuyên gia YouTube SEO. Hãy viết một bài đăng hoàn chỉnh bao gồm: "
            "Tiêu đề thu hút, Mô tả chi tiết (khoảng 500 chữ) và Danh sách Hashtag. "
            "Trình bày dưới dạng văn bản Markdown liền mạch, chuyên nghiệp."
        )
        
        final_instruction = custom_prompt if custom_prompt else default_instruction
        
        prompt = f"""
        Nội dung video: {context[:6000]}
        ---
        Yêu cầu: {final_instruction}
        """

        # Trả về văn bản thuần
        return self.llm.send_prompt(prompt, options={"temperature": 0.7})