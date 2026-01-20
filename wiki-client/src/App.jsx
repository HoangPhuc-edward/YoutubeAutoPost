import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IntroPage from './pages/IntroPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import SettingsPage from './pages/SettingsPage'; // <--- Import moi
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="/settings" element={<SettingsPage />} /> {/* <--- Route moi */}
      </Routes>
    </Router>
  );
}

export default App;