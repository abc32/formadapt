import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import translate from '../i18n';
import ApiError from './ApiError';

// Login component now accepts onLoginSuccess prop
function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      // Try to parse JSON response for more detailed error messages from backend
      const data = await response.json(); 

      if (!response.ok) {
        // Use backend error message if available, otherwise a default one
        throw new Error(data.message || 'Invalid credentials');
      }
      
      localStorage.setItem('token', data.token);
      // The role is now set in App.jsx's handleLogin via onLoginSuccess
      // localStorage.setItem('role', data.role); // This line is removed as App.jsx handles it

      if (onLoginSuccess) {
        onLoginSuccess(data.role); // Pass the role to App.jsx
      }
      
      // Navigate based on the role
      navigate(data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      // Ensure a user-friendly error message is set
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{translate('login.title')}</h2>
      <label htmlFor="email">{translate('login.email')}</label>
      <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label htmlFor="password">{translate('login.password')}</label>
      <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

      <button type="submit">{translate('login.submit')}</button>
      <p><Link to="/reset-password">{translate('login.resetPassword')}</Link></p>
      {error && <ApiError message={error} />}
    </form>
  );
}

export default Login;
