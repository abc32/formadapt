import React, { useState } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function UpdatePassword() {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
      event.preventDefault();
      try {
        const response = await fetch(`/api/update-password/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) {
          throw new Error('Failed to update password');
        }
        setMessage(translate('updatePassword.passwordUpdated'));
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <div className="update-password">
        <h2>{translate('updatePassword.title')}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password">{translate('updatePassword.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">{translate('updatePassword.submit')}</button>
        </form>
        {message && <p>{message}</p>}
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default UpdatePassword;
