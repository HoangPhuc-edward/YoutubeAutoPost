# YouTube SEO AI Assistant

Ứng dụng hỗ trợ sáng tạo nội dung YouTube chuyên nghiệp. Hệ thống tự động chuyển đổi nội dung video thành bài viết SEO hoàn chỉnh bao gồm Tiêu đề, Mô tả và Hashtag chỉ với một click.

---

## 🛠 Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các thành phần sau:
* Python 3.10+: Nền tảng để chạy Backend API.
* Node.js: Phiên bản mới nhất để khởi chạy Frontend React.
* **FFmpeg**: Công cụ bắt buộc để xử lý âm thanh từ video YouTube.

### 📦 Hướng dẫn cài đặt FFmpeg và cấu hình System Path (Windows)
1. Tải bản build FFmpeg mới nhất tại: [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/) (Chọn bản `ffmpeg-git-full.7z`).
2. Giải nén thư mục vào ổ đĩa (Ví dụ: `C:\ffmpeg`).
3. Sao chép đường dẫn đến thư mục `bin` bên trong (Ví dụ: `C:\ffmpeg\bin`).
4. Thêm vào System Path:
    - Tìm kiếm "Edit the system environment variables" trên máy tính.
    - Nhấn vào nút **Environment Variables**.
    - Tại mục **System variables**, tìm và chọn dòng **Path**, sau đó nhấn **Edit**.
    - Nhấn **New** và dán đường dẫn thư mục `bin` đã copy ở trên vào.
    - Nhấn **OK** để lưu lại tất cả các cửa sổ.
5. Kiểm tra bằng lệnh: `ffmpeg -version` trong terminal.

---

## 📥 Hướng dẫn cài đặt dự án

### 1. Cài đặt Backend
Mở terminal và di chuyển vào thư mục nguồn của dự án:
```
cd src
```

Cài đặt các thư viện từ file requirements.txt có sẵn:
```
pip install -r requirements.txt
```

Khởi chạy server:
```
python api.py
```
(Server sẽ mặc định chạy tại địa chỉ: http://localhost:8000)

---

### 2. Cài đặt Frontend
Mở một terminal mới và di chuyển vào thư mục giao diện:
```
cd wiki-client
```

Cài đặt các gói phụ thuộc:
```
npm install
```

Khởi chạy giao diện người dùng:
```
npm run dev
```
(Truy cập ứng dụng tại địa chỉ: http://localhost:5173)

---

## ⚙️ Cấu hình AI Engine

Hệ thống hỗ trợ linh hoạt giữa AI chạy cục bộ và API đám mây:

* Sử dụng Ollama (Mặc định):
    - Tải và cài đặt Ollama.
    - Chạy lệnh sau để tải mô hình mặc định: ollama pull qwen2.5:3b.

* Sử dụng API (Groq/OpenAI):
    - Truy cập vào phần Cài đặt Model trên giao diện ứng dụng.
    - Thêm cấu hình API Key và Endpoint tương ứng để sử dụng các mô hình AI trên Cloud.

---
## ⚙️ Hướng dẫn sử dụng

1. Thêm model LLM muốn sử dụng. Tại Thư viện, nhấn "Cài đặt AI" để có thể tuỳ chỉnh mô hình LLM mà bạn muốn sử dụng (Ollama hoặc GroqAPI)
2. Nhấn "Tạo bài viết mới", sau đó nhập tên và thêm url youtube, công cụ sẽ tự động xử lý và cho ra bài viết
3. Copy vào clipboard để có thể sử dụng tiếp tục

---
## 🔑 Hướng dẫn cấu hình Google Drive (Để sử dụng tính năng Lưu vào Drive)

Để ứng dụng có quyền lưu file trực tiếp vào Google Drive của bạn, hãy thực hiện các bước sau:
1. Truy cập Google Cloud Console: Đăng nhập vào Google Cloud Console bằng tài khoản Gmail của bạn.
2. Tạo dự án mới: Nhấn vào danh sách dự án ở góc trên bên trái, chọn "New Project", đặt tên bất kỳ (ví dụ: YoutubeAutoPost) và nhấn "Create".
3. Bật Google Drive API: Tìm kiếm từ khóa "Google Drive API" trên thanh tìm kiếm ở trên cùng, chọn kết quả tương ứng và nhấn nút "Enable".
4. Thiết lập màn hình xác thực (OAuth Consent Screen):
- Chọn mục "OAuth consent screen" ở cột bên trái.
- Chọn "External" rồi nhấn "Create".
- Chỉ cần điền các thông tin bắt buộc: App name, User support email và Developer contact info (có thể dùng email của bạn cho cả 3 mục).
- Nhấn "Save and Continue" cho đến khi hoàn tất.
5. Tạo thông tin xác thực (Credentials):
- Chọn mục "Credentials" ở cột bên trái.
- Nhấn "Create Credentials" ở phía trên, chọn "OAuth client ID".
- Ở mục Application type, chọn "Desktop app".
- Nhấn "Create", sau đó một bảng hiện ra, hãy nhấn "Download JSON".
6. Cài đặt vào dự án:
- Đổi tên file vừa tải về thành chính xác là credentials.json.
- Sao chép và dán file này vào thư mục src của dự án (nằm cùng cấp với file api.py).

⚠️ Lưu ý quan trọng: Lần đầu tiên bạn nhấn nút "Lưu vào Drive" trên ứng dụng, một cửa sổ trình duyệt sẽ hiện ra yêu cầu bạn đăng nhập và cấp quyền. Hãy nhấn chọn tài khoản của bạn và đồng ý để hoàn tất kết nối.




## 📖 Tính năng chính

* Xử lý đa nguồn: Tự động lấy Transcript từ link YouTube thông qua công nghệ Whisper.
* Viết bài SEO: Tạo bài viết liền mạch, sạch sẽ (không dính nhãn thừa) và hỗ trợ chỉnh sửa nội dung trực tiếp.
* Lưu trữ & Sao chép: Hỗ trợ lưu lại bài viết vào Database (wiki_app.db) và sao chép nhanh toàn bộ nội dung vào Clipboard.
