import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

# Quyền truy cập
SCOPES = ['https://www.googleapis.com/auth/drive.file']

# --- KHẮC PHỤC LỖI ĐƯỜNG DẪN ---
# Lấy đường dẫn tuyệt đối của thư mục chứa file này (tức là thư mục src)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
TOKEN_PATH = os.path.join(BASE_DIR, 'token.json')

def get_drive_service():
    """Xác thực và trả về service Google Drive"""
    creds = None
    
    # Dùng đường dẫn tuyệt đối TOKEN_PATH
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Dùng đường dẫn tuyệt đối CREDENTIALS_PATH
            if not os.path.exists(CREDENTIALS_PATH):
                # In ra đường dẫn đang tìm để dễ debug
                raise Exception(f"Không tìm thấy file tại: {CREDENTIALS_PATH}. Hãy kiểm tra lại!")
                
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Lưu token lại vào đúng chỗ
        with open(TOKEN_PATH, 'w') as token:
            token.write(creds.to_json())

    return build('drive', 'v3', credentials=creds)

def upload_text_to_drive(filename: str, content: str):
    """Tạo file .txt trên Drive"""
    service = get_drive_service()

    file_metadata = {
        'name': filename,
        'mimeType': 'text/plain'
    }
    
    media = MediaIoBaseUpload(io.BytesIO(content.encode('utf-8')),
                              mimetype='text/plain',
                              resumable=True)

    file = service.files().create(body=file_metadata,
                                  media_body=media,
                                  fields='id, webViewLink').execute()
    return file