import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

# 1. CẬP NHẬT SCOPES: Bổ sung thêm quyền truy cập Spreadsheets
SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
TOKEN_PATH = os.path.join(BASE_DIR, 'token.json')

def get_creds():
    """Hàm dùng chung để lấy thông tin xác thực"""
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise Exception(f"Không tìm thấy file tại: {CREDENTIALS_PATH}. Hãy kiểm tra lại!")
            
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        
        with open(TOKEN_PATH, 'w') as token:
            token.write(creds.to_json())
    return creds

def get_drive_service():
    """Trả về service Google Drive"""
    return build('drive', 'v3', credentials=get_creds())

def get_sheets_service():
    """Trả về service Google Sheets"""
    return build('sheets', 'v4', credentials=get_creds())

def upload_text_to_drive(filename: str, content: str):
    """Tạo file .txt trên Drive (Giữ nguyên logic cũ của bạn)"""
    service = get_drive_service()
    file_metadata = {'name': filename, 'mimeType': 'text/plain'}
    media = MediaIoBaseUpload(io.BytesIO(content.encode('utf-8')),
                              mimetype='text/plain', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media,
                                  fields='id, webViewLink').execute()
    return file

# 2. BỔ SUNG HÀM: append_to_sheet theo yêu cầu
def append_to_sheet(yt_url: str, title: str, timestamp: str, content: str):
    """Tìm hoặc tạo Sheet 'YouTube SEO Results' và thêm một dòng dữ liệu"""
    drive_service = get_drive_service()
    sheets_service = get_sheets_service()
    sheet_name = "YouTube SEO Results"
    
    # Bước 1: Tìm kiếm file sheet đã tồn tại
    query = f"name = '{sheet_name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    response = drive_service.files().list(q=query, fields="files(id, webViewLink)").execute()
    files = response.get('files', [])
    
    if not files:
        # Bước 2: Nếu chưa có thì tạo mới file Sheet
        spreadsheet_body = {'properties': {'title': sheet_name}}
        spreadsheet = sheets_service.spreadsheets().create(
            body=spreadsheet_body, fields='spreadsheetId,spreadsheetUrl'
        ).execute()
        spreadsheet_id = spreadsheet.get('spreadsheetId')
        spreadsheet_url = spreadsheet.get('spreadsheetUrl')
        
        # Ghi Header cho lần đầu tạo
        header = [["URL YouTube", "Tiêu đề", "Thời gian tạo", "Nội dung SEO"]]
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id, range="A1",
            valueInputOption="USER_ENTERED", body={'values': header}
        ).execute()
    else:
        spreadsheet_id = files[0].get('id')
        spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit"

    # Bước 3: Thêm dòng dữ liệu mới vào cuối bảng
    new_row = [[yt_url, title, timestamp, content]]
    sheets_service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, range="A1",
        valueInputOption="USER_ENTERED", body={'values': new_row}
    ).execute()
        
    return {"spreadsheetUrl": spreadsheet_url}