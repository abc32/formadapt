
  import { useParams, Link } from 'react-router-dom';
  import './Module.css';
  import { useEffect, useState } from 'react';
  import Quiz from './Quiz.jsx';
  import Error from './Error.jsx';
  import translate from '../i18n';
  import VideoPlayer from './VideoPlayer.jsx';
  import ApiError from './ApiError';

  function Module() {
    const { moduleId } = useParams();
    const [moduleData, setModuleData] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [notes, setNotes] = useState(localStorage.getItem(`module-${moduleId}-notes`) || '');
    const [documentUrl, setDocumentUrl] = useState('');
    const [quizScore, setQuizScore] = useState(null);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const [moduleRes, modulesRes, documentRes] = await Promise.all([
            fetch(`/api/module/${moduleId}`).then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            }),
            fetch('/api/modules').then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            }),
            fetch(`/api/module/document/${moduleId}`).then(res => {
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            }),
          ]);
          setModuleData(moduleRes);
          setModules(modulesRes);
          setDocumentUrl(documentRes.document);
          setLoading(false);
          fetchProgress();
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      };
      fetchData();
    }, [moduleId]);

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/module/${moduleId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token'),
          },
          body: JSON.stringify({ progress: 0, score: quizScore || 0 }),
        });
        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }
        // const data = await response.json();
        // setProgress(data.progress);
      } catch (err) {
        setError(err.message);
      }
    };

    useEffect(() => {
      localStorage.setItem(`module-${moduleId}-notes`, notes);
    }, [notes, moduleId]);

    const handleNoteChange = (event) => {
      setNotes(event.target.value);
    };

    const handleModuleCompletion = () => {
      setShowQuiz(true);
    };

    const handleQuizCompletion = (score) => {
      setQuizCompleted(true);
      setQuizScore(score);
      fetchProgress();
    };

    if (loading) {
      return <p>Chargement du module...</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }

    if (!moduleData) {
      return <p>Module non trouvé.</p>;
    }

    return (
      <div className="module">
        <h2 id="module-title" tabIndex={0}>{moduleData.titre}</h2>
        <div aria-labelledby="module-title" dangerouslySetInnerHTML={{ __html: moduleData.contenu }} />

        <h3 id="other-modules-heading" tabIndex={0}>{translate('module.otherModules')}</h3>
        <nav aria-labelledby="other-modules-heading">
          <ul>
            {modules
              .filter((module) => module.id !== parseInt(moduleId, 10))
              .map((module) => (
                <li key={module.id}>
                  <Link to={`/module/${module.id}`}>{module.nom}</Link>
                </li>
              ))}
          </ul>
        </nav>

        <div className="progress-bar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" role="progressbar">
          <div className="progress-indicator" style={{ width: `${progress}%` }}></div>
          <span className="progress-label">{progress}% {translate('module.completed')}</span>
        </div>

        <VideoPlayer videoSrc="/videos/module.mp4" subtitlesSrc="/subtitles/module.vtt"