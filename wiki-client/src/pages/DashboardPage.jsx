import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Plus, FileText, Trash2, Loader, Settings } from 'lucide-react';

const API_URL = "http://localhost:8000";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load danh sach session khi vao trang
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/sessions`);
      setSessions(res.data);
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    const url = prompt("Dán link YouTube để bắt đầu:", "");
    if (!url) return;

    setLoading(true);
    try {
      // 1. Lấy tiêu đề video tự động
      const titleRes = await axios.post(`${API_URL}/get-youtube-title`, { url, type: "youtube" });
      const autoTitle = titleRes.data.title;

      // 2. Tạo session với tiêu đề đã lấy
      const res = await axios.post(`${API_URL}/sessions`, { title: autoTitle });
      
      // 3. Chuyển hướng và tự động điền URL ở Workspace (thông qua state hoặc tự xử lý ở Workspace)
      navigate(`/workspace/${res.data.id}`, { state: { initialUrl: url } });
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.detail || "Không thể khởi tạo bài viết"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Ngan chan click vao card
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    
    try {
      await axios.delete(`${API_URL}/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      alert("Lỗi khi xóa", error);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Thư viện bài viết</h2>
        
        <div style={{display:'flex', gap: 10}}>
          {/* Nut vao Settings */}
          <button 
            style={{background:'white', border:'1px solid #ddd', color:'#555', padding: '10px 15px'}}
            onClick={() => navigate('/settings')}
          >
            <Settings size={18} /> Cài đặt AI
          </button>

          <button className="primary-btn" onClick={handleCreateNew}>
            <Plus size={18} /> Tạo mới
          </button>
        </div>
      
      </div>

      {loading ? (
        <div className="loading-state"><Loader className="spin" /> Đang tải dữ liệu...</div>
      ) : (
        <div className="session-grid">
          {/* Card Tao moi nhanh */}
          <div className="session-card create-card" onClick={handleCreateNew}>
            <div className="icon-circle"><Plus size={32} /></div>
            <h3>Tạo bài viết mới</h3>
          </div>

          {/* List cac bai cu */}
          {sessions.map((sess) => (
            <div key={sess.id} className="session-card" onClick={() => navigate(`/workspace/${sess.id}`)}>
              <div className="card-top">
                <FileText size={24} className="file-icon" />
                <button className="delete-btn" onClick={(e) => handleDelete(e, sess.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 style={{display: '-webkit-box',
      WebkitLineClamp: 2,           // Giới hạn tối đa 2 dòng
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',           // Ẩn phần thừa
      textOverflow: 'ellipsis',    // Thêm dấu ba chấm
      marginTop: '10px',
      fontSize: '1rem',
      lineHeight: '1.4',            // Độ cao dòng để tính toán chính xác
      height: '2.8em',              // (lineHeight * 2) để cố định khung card
      wordBreak: 'break-word'}}>{sess.title}</h3>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;