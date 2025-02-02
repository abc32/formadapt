import React, { useState, useEffect } from 'react';
  import './VideoPlayer.css';
  import ApiError from './ApiError';

  function VideoPlayer({ videoSrc, subtitlesSrc, moduleId }) {
    const [subtitles, setSubtitles] = useState('');
    const [translatedSubtitles, setTranslatedSubtitles] = useState('');
    const [translationLanguage, setTranslationLanguage] = useState(localStorage.getItem('translationLanguage') || 'fr');
    const [audioSrc, setAudioSrc] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
      localStorage.setItem('translationLanguage', translationLanguage);
      const fetchMedia = async () => {
        try {
          const response = await fetch(`/api/module/media/${moduleId}?lang=${translationLanguage}`);
          if (!response.ok) {
            throw new Error('Failed to fetch media');
          }
          const data = await response.json();
          setAudioSrc(data.audio);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchMedia();
    }, [translationLanguage, moduleId]);

    const handleTimeUpdate = async (event) => {
      const currentTime = event.target.currentTime;
      let currentSubtitles = '';
      if (currentTime > 0 && currentTime < 5) {
        currentSubtitles = 'Bienvenue dans ce module !';
      } else if (currentTime >= 5 && currentTime < 10) {
        currentSubtitles = 'Nous allons commencer par une introduction.';
      }
      setSubtitles(currentSubtitles);

      try {
        const response = await fetch(`/api/translate/?text=${currentSubtitles}&lang=${translationLanguage}`);
        if (!response.ok) {
          throw new Error('Failed to translate subtitles');
        }
        const data = await response.json();
        setTranslatedSubtitles(data.translatedText);
      } catch (err) {
        setError(err.message);
        setTranslatedSubtitles('');
      }
    };

    const handleTranslationLanguageChange = (event) => {
      setTranslationLanguage(event.target.value);
    };

    return (
      <div className="video-player">
        <video controls onTimeUpdate={handleTimeUpdate}>
          <source src={videoSrc} type="video/mp4" />
          {audioSrc && <source src={audioSrc} type="audio/mpeg" />}
          Votre navigateur ne supporte pas l'élément vidéo.
        </video>
        <p className="subtitles">{subtitles}</p>
        <p className="translated-subtitles">{translatedSubtitles}</p>
        <select value={translationLanguage} onChange={handleTranslationLanguageChange} aria-label="Sélecteur de langue de traduction">
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
          <option value="es">Espagnol</option>
          {/* Ajouter d'autres langues ici */}
        </select>
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default VideoPlayer;
