import React, { useState } from 'react';
  import ApiError from './ApiError';

  function Search({ onSearch }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    const handleChange = (event) => {
      setSearchTerm(event.target.value);
    };

    const handleSubmit = async (event) => {
      event.preventDefault();

      try {
        const response = await fetch(`/api/modules?search=${searchTerm}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        onSearch(data);
      } catch (err) {
        setError(err.message);
      }
    };

    return (
      <>
        <form onSubmit={handleSubmit}>
          <label htmlFor="search">Rechercher un module :</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={handleChange}
            placeholder="Entrez le nom du module"
            aria-label="Champ de recherche de module"
          />
          <button type="submit">Rechercher</button>
        </form>
        {error && <ApiError message={error} />}
      </>
    );
  }

  export default Search;
