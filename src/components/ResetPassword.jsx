import React, { useState } from 'react';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function ResetPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
      event.preventDefault();
      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          throw new Error('Failed to send reset email');
        }
        setMessage(translate('resetPassword.emailSent'));
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <div className="reset-password">
        <h2>{translate('resetPassword.title')}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">{translate('resetPassword.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit">{translate('resetPassword.submit')}</button>
        </form>
        {message && <p>{message}</p>}
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default ResetPassword;
