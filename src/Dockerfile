# Sử dụng Python image chính thức
FROM python:3.10-slim

# Cài đặt ffmpeg (bắt buộc cho Whisper và yt-dlp)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=2000 -r requirements.txt

# Copy toàn bộ code backend
COPY . .

# Mở cổng 8000 cho FastAPI
EXPOSE 8000

# Lệnh khởi chạy server
CMD ["python", "api.py"]