import React, { useState } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function Login() {
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
          throw new Error('Invalid credentials');
        }
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
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
