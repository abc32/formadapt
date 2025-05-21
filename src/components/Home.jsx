import './Home.css';
  import { Link } from 'react-router-dom';
  import { useEffect, useState } from 'react';
  // Removed unused: import translate from '../i18n';
  import ApiError from './ApiError';
  import { useI18n } from '../i18n'; // Ensure useI18n is imported if not already (it is used)

  function Home() {
    const { translate } = useI18n();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      fetch('/api/modules')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setModules(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, []);

    if (loading) {
      return <p>Chargement des modules...</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }

    return (
      <div className="home">
        <h1>{translate('home.title')}</h1>
        <p>{translate('home.welcome')}</p>

        <section aria-label="Présentation de FormAdapt">
          <h2>Objectifs de la plateforme</h2>
          <p>
            FormAdapt est une plateforme de formation accessible dédiée aux personnes non et malvoyantes.
            Notre objectif est de rendre l'apprentissage des logiciels courants plus accessible grâce à des
            modules adaptés et compatibles avec les lecteurs d'écran.
          </p>

          <audio controls>
            <source src="/audio/presentation.mp3" type="audio/mpeg" />
            Votre navigateur ne supporte pas l'élément audio.
          </audio>
        </section>

        <nav aria-label="Navigation rapide vers les modules">
          <h2>{translate('home.modules')}</h2>
          <ul>
            {modules.map((module) => (
              <li key={module.id}>
                <Link to={`/module/${module.id}`}>{module.nom}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    );
  }

  export default Home;
