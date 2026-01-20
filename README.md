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

## 📖 Tính năng chính

* Xử lý đa nguồn: Tự động lấy Transcript từ link YouTube thông qua công nghệ Whisper.
* Viết bài SEO: Tạo bài viết liền mạch, sạch sẽ (không dính nhãn thừa) và hỗ trợ chỉnh sửa nội dung trực tiếp.
* Lưu trữ & Sao chép: Hỗ trợ lưu lại bài viết vào Database (wiki_app.db) và sao chép nhanh toàn bộ nội dung vào Clipboard.
