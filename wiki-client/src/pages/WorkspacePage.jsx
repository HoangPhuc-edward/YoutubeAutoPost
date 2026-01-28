import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // Thêm useLocation
import axios from 'axios';
import { 
  ArrowLeft, Copy, Play, Loader2, Save, Eye, Edit3, 
  ChevronRight, RefreshCw, Globe, Settings2, X, FileText // Đã thêm FileText vào đây
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = "http://localhost:8000";

const WorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Hook để lấy state từ Dashboard gửi sang

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [urlInput, setUrlInput] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Đang tải..."); // State để giữ tiêu đề YouTube
  const [contentPrompt, setContentPrompt] = useState('Gợi ý 3 tiêu đề (mỗi tiêu đề khoảng 50 - 100 chữ), Tóm tắt nội dung chính và các điểm quan trọng nhất của video. (khoảng 300 - 500 chữ), gợi ý 5 hashtag liên quan đến video, giữa mỗi hashtag có dấu phẩy.');
  const [stylePrompt, setStylePrompt] = useState('Mỗi tiêu đề trên một dòng, mô tả được viết dưới dạng mô tả YouTube, sử dụng emoji, phân đoạn rõ ràng, thêm markdown đẹp mắt và thêm giữa các hashtag là dấu phẩy.');
  const [fullContent, setFullContent] = useState("");
  const [driveFileName, setDriveFileName] = useState("wiki_text.txt");

  useEffect(() => {
    // Lấy URL từ Dashboard gửi qua (nếu có)
    if (location.state?.initialUrl) {
      setUrlInput(location.state.initialUrl);
    }

    const loadSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/sessions/${id}`);
        setSessionTitle(res.data.title); // Lấy tiêu đề từ DB
        if (res.data.wiki_content) {
          setFullContent(res.data.wiki_content);
          setStep(3);
        }
      } catch (err) { console.error("Lỗi tải session:", err); }
    };
    loadSession();
  }, [id, location.state]);

  const handleGenerate = async () => {
    setProcessing(true);
    setStep(3);
    setShowModal(false);
    try {
      // Gửi URL vào source trước khi tạo bài
      await axios.post(`${API_URL}/sessions/${id}/add-url`, { url: urlInput, type: "youtube" });
      const finalPrompt = `NỘI DUNG: ${contentPrompt} \nTRÌNH BÀY: ${stylePrompt}`;
      const res = await axios.post(`${API_URL}/sessions/${id}/generate-youtube-seo`, { custom_prompt: finalPrompt });
      setFullContent(res.data.content);
    } catch (err) {
      alert("Lỗi: " + err.message);
      setStep(2);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveToDB = async () => {
    try {
      await axios.put(`${API_URL}/sessions/${id}/save`, { content: fullContent, outline: [] });
      alert("Đã lưu bài viết vào thư viện!");
      navigate('/dashboard');
    } catch (err) { alert("Lỗi khi lưu: " + err.message); }
  };

  const handleSaveToDrive = async () => {
    if (!fullContent) return alert("Chưa có nội dung để lưu!");
    try {
      const check = await axios.get(`${API_URL}/check-drive-setup`);
      if (!check.data.ready) return alert(check.data.message);

      const res = await axios.post(`${API_URL}/sessions/${id}/save-drive`, {
        filename: driveFileName,
        content: fullContent
      });
      alert("Đã lưu thành công vào Google Drive!");
      window.open(res.data.link, '_blank');
    } catch (error) {
      alert("Lỗi Drive: " + (error.response?.data?.detail || "Lỗi kết nối"));
    }
  };

  const handleSaveToSheet = async () => {
  if (!fullContent) return alert("Chưa có nội dung!");
  setProcessing(true);
  try {
    await axios.post(`${API_URL}/sessions/${id}/save-sheet`, {
      content: fullContent,
      outline: [] 
    });
    const MY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1K7AHUvdFJuxrqbHpsYPKeCGenjL2SOCavKPSPV-sVxk/edit?gid=0#gid=0'

    window.open(MY_SHEET_URL, '_blank')
    alert("Đã lưu vào Google Sheets và Thư viện!");
    navigate('/dashboard'); // Tự động quay về Dashboard sau khi lưu xong
    
  } catch (error) {
    alert("Lỗi: " + (error.response?.data?.detail || error.message));
  } finally {
    setProcessing(false);
  }
};
  return (
    <div className="wizard-container">
      {/* Modal Sửa Prompt (Giữ nguyên logic inline của bạn) */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', width: '600px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Tuỳ chỉnh prompt</h3>
              <X style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Yêu cầu Nội dung</label>
              <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px' }} rows="4" value={contentPrompt} onChange={(e) => setContentPrompt(e.target.value)} />
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Yêu cầu Trình bày</label>
              <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} rows="4" value={stylePrompt} onChange={(e) => setStylePrompt(e.target.value)} />
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', textAlign: 'right' }}>
              <button style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={handleGenerate}>Xác nhận & Tạo lại</button>
            </div>
          </div>
        </div>
      )}

      <header className="wizard-header">
        <button className="back-circle-btn" onClick={() => (step === 1 || step === 3) ? navigate('/dashboard') : setStep(step - 1)}>
          <ArrowLeft size={20}/>
        </button>
        <h2 className="header-title">
          {step === 1 && "Thiết lập nguồn tin"}
          {step === 2 && "Định dạng bài viết"}
          {step === 3 && "Kết quả nội dung"}
        </h2>
        <div style={{width: 40}}></div>
      </header>

      <main className="wizard-content">
        {step === 1 && (
          <div className="step-screen fade-in">
            <div className="input-box-70">
              <div className="input-group">
                <label className="ws-label">Tiêu đề YouTube (Tự động trích xuất)</label>
                <p className="step-description">Đây là tiêu đề video chúng tôi đã tìm thấy từ link của bạn.</p>
                {/* Thay vì input URL, hiển thị Tiêu đề đã lấy được */}
                <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#1e293b' }}>
                  {sessionTitle}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>Link gốc: {urlInput}</p>
              </div>
              <div className="input-group" style={{marginTop: 40}}>
                <label className="ws-label">Bước 2: Nội dung bạn muốn viết</label>
                <p className="step-description">Mặc định đã được tối ưu cho YouTube SEO.</p>
                <textarea className="ws-textarea-large" rows="5" value={contentPrompt} onChange={e => setContentPrompt(e.target.value)} />
              </div>
              <button className="next-btn" onClick={() => setStep(2)}>
                Tiếp tục bước tiếp theo <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-screen fade-in">
            <div className="input-box-70">
              <div className="input-group">
                <label className="ws-label">Bước 3: Tùy chọn cách trình bày</label>
                <p className="step-description">Cách AI chia đoạn, sử dụng emoji và hashtag.</p>
                <textarea className="ws-textarea-large" rows="8" value={stylePrompt} onChange={e => setStylePrompt(e.target.value)} />
              </div>
              <button className="main-gen-btn" onClick={handleGenerate}>
                <Play size={20} fill="currentColor"/> KHỞI TẠO BÀI VIẾT
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="result-container fade-in" style={{ padding: '20px 40px' }}>
            <div className="summary-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="summary-item"><Globe size={14}/> <span>{urlInput ? urlInput.substring(0, 30) + "..." : "Dữ liệu cũ"}</span></div>
                <div className="summary-item"><strong>Chủ đề:</strong> {sessionTitle.substring(0, 30)}...</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="regen-mini-btn" onClick={() => setShowModal(true)}>
                  <Settings2 size={14}/> Sửa prompt
                </button>
                <button className="regen-mini-btn" onClick={handleGenerate} disabled={processing}>
                  <RefreshCw size={14} className={processing ? "spin" : ""}/> Tạo lại
                </button>
              </div>
            </div>

            {processing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80 }}>
                <Loader2 className="spin" size={40} color="#2563eb" />
                <p>AI đang xử lý dữ liệu video...</p>
              </div>
            ) : (
              <div className="result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '30px' }}>
                <div className="content-column" style={{ border: '1px solid black', borderRadius: '12px', backgroundColor: 'white', overflow: 'hidden', height: 'calc(100vh - 250px)' }}>
                  {isPreview ? (
                    <div className="markdown-body" style={{ padding: '30px', height: '100%', overflowY: 'auto' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullContent}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea style={{ width: '100%', height: '100%', padding: '30px', border: 'none', fontSize: '1rem', lineHeight: '1.6', outline: 'none', resize: 'none' }} value={fullContent} onChange={e => setFullContent(e.target.value)} />
                  )}
                </div>

                <div className="action-column">
                  <p style={{fontSize: '1rem', fontWeight: 'bold'}}>Công cụ bài viết</p>
                  <button className={`side-btn ${!isPreview ? 'active' : ''}`} onClick={() => setIsPreview(!isPreview)}>
                    {isPreview ? <Edit3 size={18}/> : <Eye size={18}/>}
                    {isPreview ? "Chỉnh sửa thô" : "Xem định dạng"}
                  </button>
                  <hr className="divider" />
                  <p style={{fontSize: '1rem', fontWeight: 'bold'}}>Thao tác với bài viết</p>
                  <button className="save-main-btn" onClick={() => {navigator.clipboard.writeText(fullContent); alert("Đã copy!")}}>
                    <Copy size={18}/> Sao chép bài
                  </button>
                  <button className="save-main-btn" onClick={handleSaveToDB}>
                    <Save size={18}/> Lưu vào thư viện
                  </button>
                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Tên file Drive</label>
                    <input type="text" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '8px', fontSize: '0.9rem' }} value={driveFileName} onChange={(e) => setDriveFileName(e.target.value)} />
                    <button className="save-main-btn" onClick={handleSaveToDrive} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', marginBottom: '10px' }}>
                      <Save size={18}/> Lưu vào Drive
                    </button>
                    <button className="save-main-btn" onClick={handleSaveToSheet} style={{ backgroundColor: '#0f9d58', color: 'white', border: 'none' }}>
                      <FileText size={18}/> Lưu vào Google Sheets
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkspacePage;