import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Trash2, Server, Key, Box, Activity, Plus, Save } from 'lucide-react';

const API_URL = "http://localhost:8000";

const SettingsPage = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState(null);
 
  const [formData, setFormData] = useState({
    name: "Groq Llama3",
    provider: "openai", // mac dinh
    base_url: "https://api.groq.com/openai/v1",
    api_key: "",
    model_name: "llama3-70b-8192"
  });
  
  const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await axios.get(`${API_URL}/models`);
      setModels(res.data);
    } catch (error) {
      console.error("Lỗi tải models", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Tu dong dien URL mau khi chon Provider
  const handleProviderChange = (e) => {
    const provider = e.target.value;
    let newData = { ...formData, provider };
    
    if (provider === 'openai') {
      newData.base_url = "https://api.groq.com/openai/v1";
      newData.model_name = "llama3-70b-8192";
    } else if (provider === 'ollama') {
      newData.base_url = "http://localhost:11434";
      newData.model_name = "qwen2.5:3b";
      newData.api_key = "";
    }
    setFormData(newData);
  };

  
  const handleEdit = (model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      base_url: model.base_url,
      api_key: model.api_key || "",
      model_name: model.model_name
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Cuộn lên đầu để sửa
  };


  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg("Đang kết nối thử...");
    try {
      const res = await axios.post(`${API_URL}/models/test`, formData);
      setTestStatus('success');
      setTestMsg(res.data.message);
    } catch (error) {
      setTestStatus('error');
      setTestMsg("Kết nối thất bại: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleSave = async () => {
  if (testStatus !== 'success') {
    if (!confirm("Bạn chưa test kết nối thành công. Có chắc muốn lưu không?")) return;
  }
  try {
    if (editingModel) {
      // Nếu đang sửa thì gọi PUT
      await axios.put(`${API_URL}/models/${editingModel.id}`, formData);
      alert("Đã cập nhật cấu hình!");
    } else {
      // Nếu không thì gọi POST (thêm mới)
      await axios.post(`${API_URL}/models`, formData);
      alert("Đã lưu cấu hình mới!");
    }
    
    fetchModels();
    setEditingModel(null); // Reset trạng thái sửa
    setFormData({ name: "", provider: "openai", base_url: "", api_key: "", model_name: "" });
    setTestStatus(null);
    setTestMsg("");
  } catch (error) {
    alert("Lỗi khi lưu cấu hình", error);
  }
};

  const handleActivate = async (id) => {
    try {
      await axios.post(`${API_URL}/models/${id}/activate`);
      fetchModels(); // Reload de cap nhat UI
    } catch (error) {
      alert("Lỗi kích hoạt");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa cấu hình này?")) return;
    try {
      await axios.delete(`${API_URL}/models/${id}`);
      fetchModels();
    } catch (error) {
      alert("Lỗi xóa");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <button onClick={() => navigate('/dashboard')} style={{background:'transparent', color:'#333', padding:0, width:'auto'}}>
            <ArrowLeft />
          </button>
          <h2>Cài đặt Mô hình AI (LLM)</h2>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40}}>
        
        {/* COT TRAI: DANH SACH MODEL */}
        <div>
          <h3 style={{marginBottom: 20}}>Danh sách cấu hình</h3>
          {loading ? <p>Đang tải...</p> : (
            <div className="model-list">
              {models.length === 0 && <p style={{color:'#666'}}>Chưa có model nào. Hãy thêm mới bên phải.</p>}
              
              {models.map(model => (
                <div key={model.id} className={`model-card ${model.is_active ? 'active-model' : ''}`}>
                  <div style={{flex: 1}}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                      <strong>{model.name}</strong>
                      {model.is_active && <span className="badge">Đang dùng</span>}
                    </div>
                    <div style={{fontSize: '0.85rem', color: '#666', marginTop: 5}}>
                      {model.provider.toUpperCase()} - {model.model_name}
                    </div>
                    <div style={{fontSize: '0.8rem', color: '#999', marginTop: 2}}>{model.base_url}</div>
                  </div>

                  <div style={{display:'flex', flexDirection:'column', gap: 5}}>
                    {!model.is_active && (
                      <button className="primary-btn" style={{padding: '5px 10px', fontSize:'0.8rem'}} onClick={() => handleActivate(model.id)}>
                        Kích hoạt
                      </button>
                    )}
                    <button className="primary-btn"  style={{padding: '5px 10px', fontSize:'0.8rem'}} onClick={() => handleEdit(model)}>Sửa</button>
                    <button className="delete-btn-text" onClick={() => handleDelete(model.id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COT PHAI: FORM THEM MOI */}
        <div className="form-box">
          <h3 style={{marginBottom: 20}}>{editingModel ? `Đang sửa Model: ${editingModel?.name || 'Không xác định'}` : "Thêm Model Mới"}</h3>
          
          <div className="form-group">
            <label>Loại Provider</label>
            <select name="provider" value={formData.provider} onChange={handleProviderChange}>
              <option value="openai">OpenAI Compatible (Groq, DeepSeek, ChatGPT)</option>
              <option value="ollama">Ollama Local</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tên hiển thị (Gợi nhớ)</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="VD: Groq Siêu Nhanh" />
          </div>

          <div className="form-group">
            <label>Base URL <span style={{fontSize:'0.8em', color:'#666'}}>(Endpoint API)</span></label>
            <input type="text" name="base_url" value={formData.base_url} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>API Key <span style={{fontSize:'0.8em', color:'#666'}}>(Để trống nếu dùng Ollama)</span></label>
            <input type="password" name="api_key" value={formData.api_key} onChange={handleInputChange} placeholder="sk-..." />
          </div>

          <div className="form-group">
            <label>Model Name (Trên Server)</label>
            <input type="text" name="model_name" value={formData.model_name} onChange={handleInputChange} placeholder="VD: llama3-70b-8192" />
          </div>

          {/* Khu vuc Test & Save */}
          <div style={{marginTop: 20, padding: 15, background: '#f8fafc', borderRadius: 8}}>
            <div style={{display:'flex', gap: 10, marginBottom: 10}}>
              <button onClick={handleTestConnection} style={{background: '#64748b', color:'white', flex: 1}}>
                <Activity size={16}/> Test Kết Nối
              </button>
              <button onClick={handleSave} className="primary-btn" style={{flex: 1}} disabled={testStatus === 'testing'}>
                <Save size={16}/> Lưu Cấu Hình
              </button>
            </div>
            
            {testMsg && (
              <div style={{
                fontSize: '0.9rem', 
                color: testStatus === 'success' ? 'green' : testStatus === 'error' ? 'red' : 'blue',
                padding: 10, background: 'white', border: '1px solid #eee', borderRadius: 4
              }}>
                {testMsg}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;