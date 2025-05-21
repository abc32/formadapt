import React, { useState } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import translate from '../i18n';
  import ApiError from './ApiError';

  // Assume handleLogin is passed as a prop from App.jsx
  function Login({ handleLogin }) { 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Invalid credentials' }));
          throw new Error(errorData.message || 'Invalid credentials');
        }
        const data = await response.json(); // Expects { token, user: { id, nom, email, role } }
        
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('userName', data.user.nom);
          localStorage.setItem('userId', data.user.id); // Storing userId might be useful
          localStorage.setItem('userEmail', data.user.email); // Storing userEmail might be useful

          // Call handleLogin passed from App.jsx to update global state
          if (handleLogin) {
            handleLogin({
              isLoggedIn: true,
              userRole: data.user.role,
              userName: data.user.nom,
              userId: data.user.id,
              userEmail: data.user.email
            });
          }
          navigate('/dashboard');
        } else {
          throw new Error('Login failed: No token or user data received.');
        }
      } catch (err) {
        setError(err.message || 'An error occurred during login.');
      }
    };

    return (
      <form onSubmit={handleSubmit} aria-labelledby="login-title">
        <h2 id="login-title">{translate('login.title')}</h2>
        
        <label htmlFor="email">{translate('login.email')}</label>
        <input 
          type="email" 
          id="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          aria-required="true" 
        />

        <label htmlFor="password">{translate('login.password')}</label>
        <input 
          type="password" 
          id="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          aria-required="true" 
        />

        <button type="submit">{translate('login.submit')}</button>
        <p><Link to="/reset-password">{translate('login.resetPassword')}</Link></p>
        {/* Assuming ApiError component itself will handle role="alert" or similar for announcements */}
        {error && <ApiError message={error} id="login-error-message" />} 
      </form>
    );
  }

  export default Login;
