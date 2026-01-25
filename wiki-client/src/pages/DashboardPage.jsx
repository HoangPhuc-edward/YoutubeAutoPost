import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
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
    const title = prompt("Nhập tên chủ đề bài viết mới:", "Chủ đề mới");
    if (!title) return;

    try {
      const res = await axios.post(`${API_URL}/sessions`, { title });
      // Tao xong chuyen huong ngay den trang Workspace
      navigate(`/workspace/${res.data.id}`);
    } catch (error) {
      alert("Không thể tạo bài viết mới");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Ngan chan click vao card
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    
    try {
      await axios.delete(`${API_URL}/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      alert("Lỗi khi xóa");
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
              <h3>{sess.title}</h3>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;