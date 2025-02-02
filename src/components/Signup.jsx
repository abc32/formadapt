import React, { useState } from 'react';

  function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/api/signup', { // Adapter l'URL de l'API
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Gérer la réponse du serveur (e.g., redirection, message de succès)
        console.log('Inscription réussie !');

      } catch (error) {
        console.error('Erreur lors de l’inscription :', error);
        // Afficher un message d'erreur à l'utilisateur
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <h2>Inscription</h2>
        <label htmlFor="email">Email :</label>
        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password">Mot de passe :</label>
        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit">S'inscrire</button>
      </form>
    );
  }

  export default Signup;
