import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Database, PenTool, ArrowRight } from 'lucide-react';

// Sửa file IntroPage.jsx
const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div className="intro-container">
      <header className="intro-header">
        <h1>YouTube SEO <span className="beta-tag">AI</span></h1>
        <p>Biến video YouTube thành bài đăng chuẩn SEO chỉ trong tích tắc.</p>
      </header>

      <div className="features-grid">
        <div className="feature-card">
          <Database className="icon" size={40} color="green" />
          <h3>Trích xuất Transcript</h3>
          <p>Tự động nghe và hiểu nội dung video thông qua công nghệ AI Whisper.</p>
        </div>
        <div className="feature-card">
          <PenTool className="icon" size={40} color="blue" />
          <h3>Viết Bài SEO</h3>
          <p>Tạo Tiêu đề, Mô tả và Hashtag tối ưu hóa tìm kiếm tự động.</p>
        </div>
      </div>

      <div className="action-area">
        <button className="primary-btn big-btn" onClick={() => navigate('/dashboard')}>
          Bắt đầu ngay <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};
export default IntroPage;