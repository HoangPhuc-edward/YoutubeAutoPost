import os
import shutil
import uuid
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from llm_engine import LLMManager
# Import Models
from database import SessionModel, SourceModel, get_db, init_db
from wiki_composer import WikiComposer
from database import SessionLocal, LLMConfig
from drive_service import upload_text_to_drive
# Khoi tao DB & App
init_db()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khoi tao Composer
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
composer = WikiComposer(base_dir=os.path.join(BASE_DIR, "data_storage"))
TEMP_DIR = os.path.join(BASE_DIR, "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

# --- Schemas (Cập nhật sửa lỗi) ---
class SessionCreate(BaseModel):
    title: str = "Bài viết mới"

class UrlRequest(BaseModel):
    url: str
    type: str = "url"

class GenerateReq(BaseModel):
    prompt: Optional[str] = None

class WriteSectionReq(BaseModel):
    section_title: str

class SaveReq(BaseModel):
    content: str
    outline: list

class DriveSaveReq(BaseModel):
    filename: str
    content: str

# [FIX LỖI 422] Thêm class này để nhận JSON {used_ids: [...]}
class GenerateFooterReq(BaseModel):
    used_ids: List[int]

# --- API SESSIONS ---
@app.post("/sessions")
def create_session(item: SessionCreate, db: Session = Depends(get_db)):
    new_id = str(uuid.uuid4())
    db_sess = SessionModel(id=new_id, title=item.title)
    db.add(db_sess)
    db.commit()
    db.refresh(db_sess)
    return db_sess

@app.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    return db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()

@app.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not sess: raise HTTPException(404, "Not found")
    outline = json.loads(sess.outline) if sess.outline else []
    return {
        "id": sess.id, "title": sess.title, 
        "wiki_content": sess.wiki_content, "outline": outline,
        "sources": sess.sources
    }

@app.put("/sessions/{session_id}/save")
def save_session(session_id: str, req: SaveReq, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not sess: raise HTTPException(404, "Not found")
    sess.wiki_content = req.content
    sess.outline = json.dumps(req.outline, ensure_ascii=False)
    db.commit()
    return {"status": "saved"}

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not sess: raise HTTPException(404, "Not found")
    db.delete(sess)
    db.commit()
    return {"status": "deleted"}

# --- API SOURCES ---
@app.post("/sessions/{session_id}/upload")
async def upload_source(session_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(TEMP_DIR, f"{session_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    ext = file.filename.split('.')[-1].lower()
    itype = "unknown"
    if ext == "docx": itype = "docx"
    elif ext == "pdf": itype = "pdf"
    elif ext in ["mp3", "wav", "m4a"]: itype = "audio"
    
    if itype == "unknown": raise HTTPException(400, "Unsupported file type")

    success = composer.process_input_to_vector(file_path, itype, session_id=session_id)
    
    src = SourceModel(
        session_id=session_id, name=file.filename, 
        source_type=itype, source_path=file_path, 
        status="done" if success else "error"
    )
    db.add(src)
    db.commit()
    return src

@app.post("/sessions/{session_id}/add-url")
def add_url(session_id: str, req: UrlRequest, db: Session = Depends(get_db)):
    success = composer.process_input_to_vector(req.url, req.type, session_id=session_id)
    src = SourceModel(
        session_id=session_id, name=req.url, 
        source_type=req.type, source_path=req.url, 
        status="done" if success else "error"
    )
    db.add(src)
    db.commit()
    return src

# --- API GENERATE ---
@app.post("/sessions/{session_id}/suggestions")
def get_suggestions(session_id: str):
    return {"suggestions": composer.get_prompt_suggestion(session_id)}

@app.post("/sessions/{session_id}/generate-outline")
def gen_outline(session_id: str, req: GenerateReq, db: Session = Depends(get_db)):
    outline = composer.generate_outline(session_id, custom_instruction=req.prompt)
    sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if sess:
        sess.outline = json.dumps(outline, ensure_ascii=False)
        db.commit()
    return {"outline": outline}

@app.post("/sessions/{session_id}/write-section")
def write_sec(session_id: str, req: WriteSectionReq):
    content, used_ids = composer.write_section(req.section_title, session_id)
    return {"content": content, "used_ids": used_ids}

# [FIX LỖI 422] Sửa hàm này để nhận object req: GenerateFooterReq
@app.post("/sessions/{session_id}/generate-footer")
def gen_footer(session_id: str, req: GenerateFooterReq):
    # LƯU Ý: Phải truyền session_id=session_id vào đây
    return {"footer": composer.generate_bibliography(req.used_ids, session_id=session_id)}

# --- Pydantic Models cho Config ---
class LLMConfigBase(BaseModel):
    name: str
    provider: str # "openai" | "ollama"
    base_url: str
    api_key: Optional[str] = None
    model_name: str

class LLMConfigCreate(LLMConfigBase):
    pass

class LLMConfigResponse(LLMConfigBase):
    id: int
    is_active: bool
    class Config:
        orm_mode = True

# --- API QUẢN LÝ MODEL ---

@app.get("/models", response_model=List[LLMConfigResponse])
def get_models(db: Session = Depends(get_db)):
    """Lấy danh sách các cấu hình model"""
    return db.query(LLMConfig).all()

@app.post("/models")
def create_model(config: LLMConfigCreate, db: Session = Depends(get_db)):
    """Thêm cấu hình mới"""
    new_config = LLMConfig(
        name=config.name,
        provider=config.provider,
        base_url=config.base_url,
        api_key=config.api_key,
        model_name=config.model_name,
        is_active=False # Mới tạo thì chưa active ngay
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config

@app.post("/models/{model_id}/activate")
def activate_model(model_id: int, db: Session = Depends(get_db)):
    """Kích hoạt 1 model, tắt các model khác"""
    # 1. Deactivate all
    db.query(LLMConfig).update({LLMConfig.is_active: False})
    
    # 2. Activate one
    target = db.query(LLMConfig).filter(LLMConfig.id == model_id).first()
    if not target:
        raise HTTPException(404, "Model not found")
    
    target.is_active = True
    db.commit()
    return {"status": "activated", "model": target.name}

@app.delete("/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    """Xóa cấu hình"""
    target = db.query(LLMConfig).filter(LLMConfig.id == model_id).first()
    if not target:
        raise HTTPException(404, "Not found")
    db.delete(target)
    db.commit()
    return {"status": "deleted"}

@app.post("/models/test")
def test_model_connection(config: LLMConfigCreate):
    """Test kết nối trước khi lưu"""
    manager = LLMManager() # Class này nằm trong file api.py phải import từ llm_engine
    # Lưu ý: Cần import LLMManager ở đầu file api.py
    success, message = manager.test_connection(
        config.provider, config.base_url, config.api_key, config.model_name
    )
    if not success:
        raise HTTPException(400, detail=message)
    return {"message": message}

class YoutubeSeoReq(BaseModel):
    custom_prompt: Optional[str] = None

@app.post("/sessions/{session_id}/generate-youtube-seo")
def gen_youtube_seo(session_id: str, req: YoutubeSeoReq):
    # Trả về chuỗi văn bản liền mạch từ composer
    content = composer.generate_youtube_seo(session_id, req.custom_prompt)
    return {"content": content}



# --- API MỚI: LƯU VÀO DRIVE ---
@app.get("/check-drive-setup")
def check_drive_setup():
    # Kiểm tra file credentials.json nằm cùng cấp với api.py (thư mục src)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    creds_path = os.path.join(current_dir, "credentials.json")
    
    if not os.path.exists(creds_path):
        return {
            "ready": False, 
            "message": "Thiếu file 'credentials.json' trong thư mục src. Vui lòng thiết lập theo hướng dẫn."
        }
    return {"ready": True}

@app.post("/sessions/{session_id}/save-drive")
def save_to_drive(session_id: str, req: DriveSaveReq):
    try:
        # Gọi hàm upload
        result = upload_text_to_drive(req.filename, req.content)
        return {
            "status": "success", 
            "file_id": result.get('id'), 
            "link": result.get('webViewLink')
        }
    except Exception as e:
        print(f"Lỗi Drive: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)