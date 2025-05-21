import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import translate from '../i18n'; // Assuming you have i18n setup
  import ApiError from './ApiError'; // Assuming you have an ApiError component

  // Assume handleLogin is passed as a prop from App.jsx
  function Signup({ handleLogin }) {
    const [nom, setNom] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(null); // Reset error before new submission

      try {
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        // Signup successful, data should contain { token, user: { id, nom, email, role } }
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('userName', data.user.nom);
          localStorage.setItem('userId', data.user.id);
          localStorage.setItem('userEmail', data.user.email);

          if (handleLogin) {
            handleLogin({
              isLoggedIn: true,
              userRole: data.user.role,
              userName: data.user.nom,
              userId: data.user.id,
              userEmail: data.user.email
            });
          }
          navigate('/dashboard'); // Redirect to dashboard after successful signup and login
        } else {
          throw new Error('Signup failed: No token or user data received.');
        }

      } catch (err) {
        setError(err.message || 'An error occurred during signup.');
      }
    };

    return (
      <form onSubmit={handleSubmit} aria-labelledby="signup-title">
        <h2 id="signup-title">{translate('signup.title') || 'Sign Up'}</h2>
        
        <label htmlFor="nom">{translate('signup.name') || 'Name'}:</label>
        <input 
          type="text" 
          id="nom" 
          value={nom} 
          onChange={(e) => setNom(e.target.value)} 
          required 
          aria-required="true" 
        />

        <label htmlFor="email">{translate('signup.email') || 'Email'}:</label>
        <input 
          type="email" 
          id="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          aria-required="true" 
        />

        <label htmlFor="password">{translate('signup.password') || 'Password'}:</label>
        <input 
          type="password" 
          id="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          aria-required="true" 
        />

        <button type="submit">{translate('signup.submit') || 'Sign Up'}</button>
        {/* Assuming ApiError component itself will handle role="alert" or similar for announcements */}
        {error && <ApiError message={error} id="signup-error-message" />}
      </form>
    );
  }

  export default Signup;
