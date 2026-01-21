// WorkspacePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Copy, Play, Loader2, Save } from 'lucide-react';

const API_URL = "http://localhost:8000";

const WorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [urlInput, setUrlInput] = useState("");
  // Cập nhật Prompt để AI không thêm nhãn thừa
  const [prompt, setPrompt] = useState("Viết bài SEO YouTube gồm Tiêu đề thu hút, Mô tả chi tiết (~500 chữ) và Hashtag. LƯU Ý: Viết nội dung liền mạch, KHÔNG bao gồm các từ như 'Tiêu đề:', 'Mô tả:', 'Hashtag:' trong bài viết.");
  const [fullContent, setFullContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load lại bài viết cũ nếu có
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await axios.get(`${API_URL}/sessions/${id}`);
        if (res.data.wiki_content) setFullContent(res.data.wiki_content);
      } catch (err) { console.error("Lỗi load data:", err); }
    };
    loadData();
  }, [id]);

  const handleGenerate = async () => {
    if (!urlInput) return alert("Vui lòng dán link YouTube!");
    setProcessing(true);
    try {
      await axios.post(`${API_URL}/sessions/${id}/add-url`, { url: urlInput, type: "youtube" });
      const res = await axios.post(`${API_URL}/sessions/${id}/generate-youtube-seo`, { custom_prompt: prompt });
      setFullContent(res.data.content);
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Hàm Lưu bài viết vào Database
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/sessions/${id}/save`, { 
        content: fullContent, 
        outline: [] // Không dùng dàn ý cho bài SEO YouTube
      });
      alert("Đã lưu bài viết thành công!");
    } catch (err) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullContent);
    alert("Đã sao chép toàn bộ nội dung!");
  };

  const handleSaveToDrive = async () => {
    if (!fullContent) return alert("Chưa có nội dung để lưu!");
    
    const fileName = `${id || 'wiki_article'}.txt`;
    
    // Hỏi xác nhận trước khi lưu (vì sẽ mở cửa sổ đăng nhập Google ở server)
    if (!confirm(`Bạn muốn lưu file "${fileName}" vào Google Drive? (Cửa sổ trình duyệt có thể bật lên để xác thực)`)) return;

    try {
      const res = await axios.post(`${API_URL}/sessions/${id}/save-drive`, {
        filename: fileName,
        content: fullContent
      });
      
      alert("Đã lưu thành công! Link: " + res.data.link);
      // Mở tab mới tới file vừa tạo (tùy chọn)
      window.open(res.data.link, '_blank');
      
    } catch (error) {
      console.error(error);
      alert("Lỗi lưu Drive: " + (error.response?.data?.detail || "Kiểm tra lại Server/Credentials"));
    } finally {
      console.log("Xong quá trình lưu Drive");
    }
  };


  return (
    <div className="workspace-layout" style={{ gridTemplateColumns: "400px 1fr" }}>
      
      {/* CỘT TRÁI: NHẬP LIỆU */}
      <div className="ws-col">
        <div className="col-header">
          <ArrowLeft onClick={() => navigate('/dashboard')} style={{cursor:'pointer'}}/> 
          YouTube SEO Tool
        </div>
        <div className="col-content">
          <label className="ws-label">Link YouTube Video</label>
          <input 
            className="ws-input" 
            value={urlInput} 
            onChange={e => setUrlInput(e.target.value)} 
            placeholder="Dán link video tại đây..."
          />

          <label className="ws-label" style={{marginTop: 20}}>Yêu cầu tùy chỉnh (Prompt)</label>
          <textarea 
            className="ws-textarea" 
            rows="8" 
            value={prompt} 
            onChange={e => setPrompt(e.target.value)} 
          />

          <button className="primary-btn" onClick={handleGenerate} disabled={processing} style={{width:'100%', marginTop: 20}}>
            {processing ? <Loader2 className="spin" /> : <Play />} Tạo bài viết SEO
          </button>
        </div>
      </div>

      {/* CỘT PHẢI: EDITOR */}
      <div className="ws-col">
        <div className="col-header">
          Trình biên tập nội dung
          <div style={{display:'flex', gap: 10}}>
            <button className="save-btn" onClick={handleSave} disabled={saving || !fullContent}>
              {saving ? <Loader2 className="spin" size={14}/> : <Save size={16}/>} Lưu bài
            </button>
            <button className="save-btn" onClick={handleSaveToDrive} disabled={saving || !fullContent}>
              {saving ? <Loader2 className="spin" size={14}/> : <Save size={16}/>} Lưu vào Drive
            </button>
            <button className="action-btn" onClick={handleCopy} disabled={!fullContent}>
              <Copy size={16}/> Sao chép
            </button>
          </div>
        </div>
        <div className="col-content" style={{padding: 10}}>
          <textarea 
            className="full-editor"
            value={fullContent}
            onChange={(e) => setFullContent(e.target.value)}
            placeholder="Nội dung bài viết sạch sẽ hiện ở đây..."
            style={{padding: '20px', border: 'none'}}
          />
        </div>
      </div>

    </div>
  );
};

export default WorkspacePage;