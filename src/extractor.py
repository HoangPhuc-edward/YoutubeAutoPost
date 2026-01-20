import os
import tempfile
import trafilatura
import fitz 
from docx import Document
import whisper
import yt_dlp

class Extractor:
    def __init__(self, model_size="base"):
        self.model = whisper.load_model(model_size)

    def extract_website(self, url: str) -> str:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            return ""
        return trafilatura.extract(downloaded) or ""

    def extract_text_file(self, file_path: str) -> str:
        text_content = ""
        
        if file_path.endswith(".pdf"):
            with fitz.open(file_path) as doc:
                for page in doc:
                    text_content += page.get_text()
                    
        elif file_path.endswith(".docx"):
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs]
            text_content = "\n".join(paragraphs)
            
        return text_content

    def extract_mp3(self, file_path: str) -> str:
        result = self.model.transcribe(file_path)
        return result["text"].strip()

    def extract_mp4(self, file_path: str) -> str:
        result = self.model.transcribe(file_path)
        return result["text"].strip()

    def extract_youtube(self, url: str) -> str:
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': '%(id)s.%(ext)s',
            
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,   
            'ignoreerrors': True,         
            'retries': 10,               
            'fragment_retries': 10,       
            'socket_timeout': 60,         
            'source_address': '0.0.0.0', 
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            ydl_opts['outtmpl'] = os.path.join(temp_dir, '%(id)s.%(ext)s')
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                audio_file = filename.rsplit(".", 1)[0] + ".mp3"

            text_content = self.extract_mp3(audio_file)
            
        return text_content
    

if __name__ == "__main__":
    extractor = Extractor(model_size="large-v3-turbo")
    print(extractor.extract_youtube("https://www.youtube.com/watch?v=vmwANBlSgOw"))