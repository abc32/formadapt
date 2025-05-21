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
  import Signup from './components/Signup'; // Import Signup

  // Define fetchWithAuth utility function
  // This function can be moved to a separate utils.js file and imported
  async function fetchWithAuth(url, options = {}, handleLogoutCb) {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };
    
    // Ensure Content-Type is set for POST/PUT requests if body is JSON
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        // Unauthorized or Forbidden
        if (handleLogoutCb) {
          console.warn(`Auth error (${response.status}) on ${url}. Logging out.`);
          handleLogoutCb(); // Call the logout callback to update state and redirect
        } else {
          // Fallback if no callback provided, though it's less ideal
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          // Consider a more robust way to trigger global logout if no callback
          window.location.href = '/login'; // Force redirect
        }
        // Throw an error to stop further processing in the calling function
        throw new Error(`Authentication error: ${response.status}`);
      }
      return response;
    } catch (error) {
      // Log network errors or other fetch issues
      console.error('Fetch error:', error);
      throw error; // Re-throw to be caught by the caller
    }
  }


  function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    // No need for navigate here, as handleLogout will be passed to components that use navigate
    // const navigate = useNavigate(); // useNavigate can only be used in context of <Router>

    useEffect(() => {
      const token = localStorage.getItem('token');
      if (token) {
        // Here you might want to verify the token with the backend
        // For now, just restore state from localStorage if token exists
        const storedRole = localStorage.getItem('userRole');
        const storedName = localStorage.getItem('userName');
        const storedId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');

        setIsLoggedIn(true);
        setUserRole(storedRole);
        setUserName(storedName);
        setUserId(storedId);
        setUserEmail(storedEmail);
        // Optionally: Call a backend endpoint to validate token and get fresh user info
      }
    }, []);

    const handleLogin = (authData) => {
      setIsLoggedIn(authData.isLoggedIn);
      setUserRole(authData.userRole);
      setUserName(authData.userName);
      setUserId(authData.userId);
      setUserEmail(authData.userEmail);
      // localStorage is set by Login/Signup components
    };

    const handleLogout = async (navigateFn) => { // navigateFn passed from component calling logout
      try {
        // The backend logout is mostly symbolic for JWT as token is client-side
        // Still, it's good practice if backend wants to do any cleanup or logging
        await fetchWithAuth('/api/logout', { method: 'POST' }, null); // No need to pass full handleLogout here for this specific call
      } catch (error) {
        console.error('Logout API call failed (token might already be invalid):', error);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        setIsLoggedIn(false);
        setUserRole(null);
        setUserName(null);
        setUserId(null);
        setUserEmail(null);
        if (navigateFn) navigateFn('/login');
        else window.location.href = '/login'; // Fallback if navigateFn not provided
      }
    };
    
    // Make fetchWithAuth available to child components, e.g. via context or by passing as prop
    // For simplicity in this task, components will call it directly or it could be exported from a utils file.
    // To use the handleLogoutCb in fetchWithAuth properly, we need to ensure it's correctly scoped or passed.
    // A simple way is to define a version of handleLogout that doesn't need navigateFn for fetchWithAuth's own use
    const internalHandleLogoutForFetcher = () => handleLogout(null);


    const { error } = useI18n();

    return (
      <I18nProvider>
        <BrowserRouter>
          {/* Pass handleLogout to Navbar so it can use it with navigate */}
          <Navbar isLoggedIn={isLoggedIn} userRole={userRole} userName={userName} handleLogout={handleLogout} />
          <LanguageSelector />
          {/* Example of nav links, can be part of Navbar or here */}
          {/* <nav> ... </nav> */}
          <Notifications />
          {error && <Error message={error} />}
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Pass fetchWithAuth and handleLogout to components that need it */}
            <Route path="/module/:moduleId" element={<Module fetchWithAuth={(url, options) => fetchWithAuth(url, options, internalHandleLogoutForFetcher)} />} />
            <Route path="/modules" element={<Modules fetchWithAuth={(url, options) => fetchWithAuth(url, options, internalHandleLogoutForFetcher)} />} />
            
            {isLoggedIn && <Route path="/dashboard" element={<Dashboard fetchWithAuth={(url, options) => fetchWithAuth(url, options, internalHandleLogoutForFetcher)} />} />}
            {/* Route for AdminPanel */}
            {isLoggedIn && userRole === 'admin' && (
              <Route path="/admin" element={<AdminPanel fetchWithAuth={(url, options) => fetchWithAuth(url, options, internalHandleLogoutForFetcher)} />} />
            )}
            
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/login" element={<Login handleLogin={handleLogin} />} />
            <Route path="/signup" element={<Signup handleLogin={handleLogin} />} /> 
            <Route path="/update-password/:token" element={<UpdatePassword />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    );
  }

  // It's often better to export fetchWithAuth from a separate utils.js file
  // For now, other components might need to be adapted to use it if they make API calls.
  // This example focuses on App.jsx, Login, Signup, Navbar.
  export { fetchWithAuth }; 
  export default App;
