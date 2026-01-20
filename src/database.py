# src/database.py
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Boolean

# Ket noi SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./wiki_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)           # VD: "Groq Cloud", "Local Ollama"
    provider = Column(String)       # "openai" (cho Groq/ChatGPT) hoặc "ollama"
    base_url = Column(String)       # VD: "https://api.groq.com/openai/v1"
    api_key = Column(String, nullable=True) # VD: "gsk_..."
    model_name = Column(String)     # VD: "llama3-70b-8192" hoặc "qwen2.5:3b"
    is_active = Column(Boolean, default=False) # Chỉ có 1 cái True tại 1 thời điểm


# Bang SESSION (Luu bai viet)
class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String, default="Bài viết mới")
    created_at = Column(DateTime, default=datetime.now)
    
    # Luu noi dung bai viet va dan y (JSON string)
    wiki_content = Column(Text, default="") 
    outline = Column(Text, default="[]") 
    
    sources = relationship("SourceModel", back_populates="session", cascade="all, delete-orphan")

# Bang SOURCE (Luu nguon)
class SourceModel(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    
    name = Column(String)       # Ten hien thi (vd: tai_lieu.pdf)
    source_type = Column(String) # pdf, docx, youtube...
    source_path = Column(String) # Duong dan file
    status = Column(String, default="processing") 
    
    session = relationship("SessionModel", back_populates="sources")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()