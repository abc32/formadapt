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

  function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user');
    const navigate = useNavigate();

    const handleLogin = () => {
      setIsLoggedIn(true);
      setUserRole('admin');
    };

    const handleLogout = async () => {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Authorization': localStorage.getItem('token') },
        });
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setIsLoggedIn(false);
        setUserRole('user');
        navigate('/login');
      } catch (error) {
        console.error('Logout failed', error);
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
            {isLoggedIn && userRole === 'admin' && <Route path="/admin" element={<Dashboard />} />}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<Login />} />
            <Route path="/update-password/:token" element={<UpdatePassword />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    );
  }

  export default App;
