import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './components/Home.jsx';
import Module from './components/Module.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import './App.css';
import Modules from './components/Modules.jsx';
import { useState, useEffect } from 'react';
import Notifications from './components/Notifications.jsx';
import LanguageSelector from './components/LanguageSelector';
import { I18nProvider, useI18n } from './i18n';
import Error from './components/Error';
import ResetPassword from './components/ResetPassword';
import Login from './components/Login';
import UpdatePassword from './components/UpdatePassword';
import AdminPanel from './components/AdminPanel.jsx';
import { fetchWithAuth } from './utils/api.js'; // Import fetchWithAuth

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user');
  const navigate = useNavigate();

  const handleLogin = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
    localStorage.setItem('role', role);
  };

  const handleLogout = async () => {
    try {
      // Use fetchWithAuth for the logout call
      const response = await fetchWithAuth('/api/logout', { method: 'POST' });
      
      if (!response.ok && response.status !== 401) { // 401 is handled by fetchWithAuth by redirecting
        // Handle other errors if needed, though fetchWithAuth might throw for 401
        console.error('Logout request failed with status:', response.status);
        // Optionally, still attempt to clear local data if server logout fails for other reasons
      }
      // If fetchWithAuth handles 401 by redirecting, the following lines might not always be reached
      // or might be redundant if the page reloads. However, it's good for explicit cleanup.
    } catch (error) {
      // Error handling for fetchWithAuth (e.g., network error or if it throws on 401)
      console.error('Logout failed:', error.message);
      // Even if the API call fails, attempt to clear local session data
    } finally {
      // Always clear local storage and update state regardless of API call success/failure
      // This ensures client-side logout even if server is unreachable or errors.
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setIsLoggedIn(false);
      setUserRole('user');
      if (window.location.pathname !== '/login') { // Prevent loop if already on login page due to fetchWithAuth redirect
          navigate('/login');
      }
    }
  };

  const { error } = useI18n();

  return (
    <I18nProvider>
      <BrowserRouter>
        <Navbar />
        <LanguageSelector />
        <nav>
          <ul>
            <li>
              {isLoggedIn ? (
                <>
                  <Link to="/dashboard">Tableau de bord</Link>
                  {userRole === 'admin' && <Link to="/admin">Admin</Link>}
                  <button onClick={handleLogout}>Déconnexion</button>
                </>
              ) : (
                <Link to="/login">Connexion</Link>
              )}
            </li>
          </ul>
        </nav>
        <Notifications />
        {error && <Error message={error} />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/module/:moduleId" element={<Module />} />
          <Route path="/modules" element={<Modules />} />
          {isLoggedIn && <Route path="/dashboard" element={<Dashboard />} />}
          {isLoggedIn && userRole === 'admin' && <Route path="/admin" element={<AdminPanel />} />}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
          <Route path="/update-password/:token" element={<UpdatePassword />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
