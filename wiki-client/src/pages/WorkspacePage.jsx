import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Copy, Play, Loader2, Save, Eye, Edit3, 
  RefreshCw, Globe, Settings2, X, FileText, Hash
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_URL = "http://localhost:8000";

const WorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [appConfig, setAppConfig] = useState({ MY_SHEET_URL: "", API_URL: "http://localhost:8000" });
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [urlInput, setUrlInput] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Đang tải...");
  const [mainPrompt, setMainPrompt] = useState(
    "Gợi ý 3 tiêu đề (mỗi tiêu đề khoảng 50 - 100 chữ).\n" +
    "Tóm tắt nội dung chính (300 - 500 chữ).\n" +
    "Gợi ý 10 hashtag liên quan, ngăn cách bởi dấu phẩy.\n" +
    "Yêu cầu: Mỗi tiêu đề một dòng, sử dụng emoji, chia đoạn rõ ràng, định dạng Markdown đẹp mắt."
  );
  
  const [fullContent, setFullContent] = useState("");
  const [hashtag, setHashtag] = useState(""); // State mới cho hashtag
  const [driveFileName, setDriveFileName] = useState("wiki_text.txt");

  // Hàm helper để tách hashtag bằng Regex
  const extractHashtags = (text) => {
    const hashtagRegex = /#[\w\u00C0-\u1EF9]+/g; // Hỗ trợ cả tiếng Việt
    const matches = text.match(hashtagRegex) || [];
    const cleanText = text.replace(hashtagRegex, '').trim();
    return {
      cleanText,
      tags: matches.join(', ') // Đảm bảo có dấu phẩy ngăn cách
    };
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/get-config`);
        setAppConfig(res.data);
      } catch (err) { console.error("Không lấy được config", err); }
    };
    fetchConfig();

    if (location.state?.initialUrl) { setUrlInput(location.state.initialUrl); }

    const loadSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/sessions/${id}`);
        setSessionTitle(res.data.title);
        
        if (res.data.wiki_content) {
          const { cleanText, tags } = extractHashtags(res.data.wiki_content);
          setFullContent(cleanText);
          setHashtag(tags);
          setStep(2);
        }
        if (res.data.outline && res.data.outline.length > 0) {
          setMainPrompt(res.data.outline[0]);
        }
      } catch (err) { console.error("Lỗi tải session:", err); }
    };
    loadSession();
  }, [id, location.state]);

  const handleGenerate = async () => {
    setProcessing(true);
    setStep(2);
    setShowModal(false);
    try {
      await axios.post(`${API_URL}/sessions/${id}/add-url`, { url: urlInput, type: "youtube" });
      const res = await axios.post(`${API_URL}/sessions/${id}/generate-youtube-seo`, { custom_prompt: mainPrompt });
      
      // Tách hashtag ngay khi AI phản hồi
      const { cleanText, tags } = extractHashtags(res.data.content);
      setFullContent(cleanText);
      setHashtag(tags);
    } catch (err) {
      alert("Lỗi: " + err.message);
      setStep(1);
    } finally { setProcessing(false); }
  };

  // Hàm gộp nội dung để lưu (đảm bảo dữ liệu DB vẫn đầy đủ)
  const getMergedContent = () => hashtag ? `${fullContent}\n\n${hashtag}` : fullContent;

  const handleSaveToDB = async () => {
    try {
      await axios.put(`${API_URL}/sessions/${id}/save`, { 
        content: getMergedContent(), 
        outline: [mainPrompt],
        prompt: mainPrompt 
      });
      alert("Đã lưu bài viết vào thư viện!");
      navigate('/dashboard');
    } catch (err) { alert("Lỗi khi lưu: " + err.message); }
  };

  const handleSaveToDrive = async () => {
    if (!fullContent) return alert("Chưa có nội dung!");
    try {
      const check = await axios.get(`${API_URL}/check-drive-setup`);
      if (!check.data.ready) return alert(check.data.message);
      await axios.post(`${API_URL}/sessions/${id}/save-drive`, {
        filename: driveFileName,
        content: getMergedContent()
      });
      alert("Đã lưu vào Drive!");
    } catch (error) { alert("Lỗi kết nối Drive"); }
  };

  const handleSaveToSheet = async () => {
    if (!fullContent) return alert("Chưa có nội dung!");
    setProcessing(true);
    try {
      await axios.post(`${API_URL}/sessions/${id}/save-sheet`, { content: getMergedContent(), outline: [] });
      if (appConfig.MY_SHEET_URL) { window.open(appConfig.MY_SHEET_URL, '_blank'); }
      alert("Đã lưu vào Sheets!");
      navigate('/dashboard');
    } catch (error) { alert("Lỗi lưu sheet"); }
    finally { setProcessing(false); }
  };

  return (
    <div className="wizard-container">
      {/* Modal Sửa Prompt Tinh gọn */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', width: '600px', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Cấu hình yêu cầu AI</h3>
              <X style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <div style={{ padding: '20px' }}>
              <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} rows="8" value={mainPrompt} onChange={(e) => setMainPrompt(e.target.value)} />
            </div>
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', textAlign: 'right' }}>
              <button style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={handleGenerate}>Cập nhật nội dung</button>
            </div>
          </div>
        </div>
      )}

      <header className="wizard-header">
        <button className="back-circle-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20}/>
        </button>
        <h2 className="header-title">{step === 1 ? "Thiết lập yêu cầu" : "Kết quả nội dung"}</h2>
        <div style={{width: 40}}></div>
      </header>

      <main className="wizard-content">
        {step === 1 && (
          <div className="step-screen fade-in">
            <div className="input-box-70">
              <div className="input-group">
                <label className="ws-label">Chủ đề Video</label>
                <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{sessionTitle}</div>
              </div>
              <div className="input-group" style={{marginTop: 30}}>
                <label className="ws-label">Hướng dẫn viết bài</label>
                <textarea className="ws-textarea-large" rows="10" value={mainPrompt} onChange={e => setMainPrompt(e.target.value)} />
              </div>
              <button className="next-btn" onClick={handleGenerate} style={{backgroundColor: '#2563eb'}}>
                <Play size={20} fill="currentColor"/> BẮT ĐẦU TẠO BÀI VIẾT
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="result-container fade-in" style={{ padding: '20px 40px' }}>
            <div className="summary-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="summary-item"><Globe size={14}/> <span>{sessionTitle.substring(0, 40)}...</span></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="regen-mini-btn" onClick={() => setShowModal(true)}><Settings2 size={14}/> Sửa yêu cầu</button>
                <button className="regen-mini-btn" onClick={handleGenerate} disabled={processing}><RefreshCw size={14} className={processing ? "spin" : ""}/> Làm mới bài</button>
              </div>
            </div>

            {processing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80 }}>
                <Loader2 className="spin" size={40} color="#2563eb" /><p>AI đang soạn thảo...</p>
              </div>
            ) : (
              <div className="result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '30px' }}>
                <div className="content-column" style={{ border: '1px solid black', borderRadius: '12px', backgroundColor: 'white', overflow: 'hidden', height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* PHẦN 1: NỘI DUNG CHÍNH (75% CHIỀU CAO) */}
                  <div style={{ height: '75%', overflowY: 'auto', borderBottom: '1px solid #000' }}>
                    {isPreview ? (
                      <div className="markdown-body" style={{ padding: '30px' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <textarea style={{ width: '100%', height: '100%', padding: '30px', border: 'none', fontSize: '1rem', outline: 'none', resize: 'none' }} value={fullContent} onChange={e => setFullContent(e.target.value)} />
                    )}
                  </div>

                  {/* PHẦN 2: HASHTAG RIÊNG BIỆT (25% CHIỀU CAO) */}
                  <div style={{ height: '25%', display: 'flex', backgroundColor: '#f8fafc', padding: '15px', gap: '15px' }}>
                    <button 
                      style={{ width: '20%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => { navigator.clipboard.writeText(hashtag); alert("Đã copy hashtag!"); }}
                    >
                      <Copy size={20} /><span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>Sao chép</span>
                    </button>
                    <textarea 
                      style={{ width: '80%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: hashtag ? '#1e293b' : '#94a3b8', resize: 'none', outline: 'none' }}
                      value={hashtag || "Hiện tại chưa có hashtag"}
                      onChange={(e) => setHashtag(e.target.value)}
                      placeholder="Nhập hashtag tại đây..."
                    />
                  </div>
                </div>

                <div className="action-column">
                  <p style={{fontWeight: 'bold'}}>Biên tập & Lưu trữ</p>
                  <button className={`side-btn ${!isPreview ? 'active' : ''}`} onClick={() => setIsPreview(!isPreview)}>
                    {isPreview ? <Edit3 size={18}/> : <Eye size={18}/>} Chế độ {isPreview ? "Sửa" : "Xem"}
                  </button>
                  <button className="save-main-btn" onClick={() => {navigator.clipboard.writeText(getMergedContent()); alert("Đã copy toàn bộ!")}}>
                    <Copy size={18}/> Sao chép tất cả
                  </button>
                  <button className="save-main-btn" onClick={handleSaveToDB}><Save size={18}/> Lưu Thư viện</button>
                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                    <input type="text" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '8px' }} value={driveFileName} onChange={(e) => setDriveFileName(e.target.value)} />
                    <button className="save-main-btn" onClick={handleSaveToDrive} style={{ backgroundColor: '#10b981', color: 'white', marginBottom: '10px' }}><Save size={18}/> Lưu Drive</button>
                    <button className="save-main-btn" onClick={handleSaveToSheet} style={{ backgroundColor: '#0f9d58', color: 'white' }}><FileText size={18}/> Lưu Sheets</button>
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