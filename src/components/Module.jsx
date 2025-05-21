import { useParams, Link } from 'react-router-dom';
  import './Module.css';
  import { useEffect, useState } from 'react';
  import Quiz from './Quiz.jsx';
  import Error from './Error.jsx';
  import translate from '../i18n';
  import VideoPlayer from './VideoPlayer.jsx';
  import ApiError from './ApiError';

  // Assuming fetchWithAuth is passed as a prop from App.jsx
  function Module({ fetchWithAuth }) {
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
        setLoading(true);
        setError(null);
        try {
          // Public GET requests for module details, all modules, and document
          const modulePromise = fetch(`/api/module/${moduleId}`).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for /api/module/${moduleId}`);
            return res.json();
          });
          const modulesPromise = fetch('/api/modules').then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for /api/modules`);
            return res.json();
          });
          const documentPromise = fetch(`/api/module/document/${moduleId}`).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for /api/module/document/${moduleId}`);
            return res.json();
          });

          const [moduleRes, modulesRes, documentRes] = await Promise.all([
            modulePromise,
            modulesPromise,
            documentPromise,
          ]);

          setModuleData(moduleRes);
          setModules(modulesRes);
          setDocumentUrl(documentRes.document);

          // Fetch user-specific progress for this module
          if (typeof fetchWithAuth === 'function' && localStorage.getItem('token')) {
            try {
              const progressRes = await fetchWithAuth(`/api/modules/${moduleId}/progress`);
              if (progressRes.ok) {
                const progressData = await progressRes.json();
                // Check if progressData is not just a message like "No progress found..."
                if (progressData && typeof progressData.progress !== 'undefined') {
                    setProgress(progressData.progress || 0);
                    setQuizScore(progressData.score === undefined ? null : progressData.score); // Handle undefined score
                    setQuizCompleted(progressData.completed || false);
                } else { 
                    setProgress(0);
                    setQuizScore(null);
                    setQuizCompleted(false);
                }
              } else if (progressRes.status === 404) { 
                console.log('No progress record found for this module. Initializing to default.');
                setProgress(0);
                setQuizScore(null);
                setQuizCompleted(false);
              } else {
                const errorData = await progressRes.json().catch(() => ({ message: `Failed to fetch progress: ${progressRes.status}` }));
                throw new Error(errorData.message);
              }
            } catch (progressErr) {
              setError(prevError => prevError ? `${prevError}\n${progressErr.message}` : progressErr.message);
              setProgress(0);
              setQuizScore(null);
              setQuizCompleted(false);
            }
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [moduleId, fetchWithAuth]);

    const updateProgressAndScore = async (newProgress, newScore, isCompleted) => {
      if (typeof fetchWithAuth !== 'function') {
        console.warn("User not authenticated or auth function not available. Cannot update progress.");
        return;
      }
      try {
        const response = await fetchWithAuth(`/api/modules/${moduleId}/progress`, { 
          method: 'POST', 
          body: JSON.stringify({ 
            progress: newProgress, 
            score: newScore, // Ensure score is a number or null
            completed: isCompleted 
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to update progress/score' }));
          throw new Error(errorData.message);
        }
        const updatedProgressData = await response.json();
        console.log("Progress and score update successfully sent to backend.", updatedProgressData);
        setProgress(updatedProgressData.progress);
        setQuizScore(updatedProgressData.score === undefined ? null : updatedProgressData.score);
        setQuizCompleted(updatedProgressData.completed);
      } catch (err) {
        setError(prevError => `${prevError ? prevError + '\n' : ''}Failed to update progress: ${err.message}`);
      }
    };

    useEffect(() => {
      localStorage.setItem(`module-${moduleId}-notes`, notes);
    }, [notes, moduleId]);

    const handleNoteChange = (event) => {
      setNotes(event.target.value);
    };

    const handleModuleCompletion = () => { // This likely triggers showing the quiz
      setShowQuiz(true);
      // Potentially update progress to indicate module content (pre-quiz) is viewed/completed
      // For example, if progress isn't solely quiz-based:
      // if (progress < 100 && !quizCompleted) updateProgressAndScore(90, quizScore, false); // Example: 90% before quiz
    };

    const handleQuizCompletion = (score) => {
      setQuizCompleted(true);
      setQuizScore(score);
      updateProgressAndScore(100, score, true); 
    };

    if (loading) {
      return <p>Chargement du module...</p>;
    }

    if (error) {
      return <ApiError message={error} />;
    }

    if (!moduleData) {
      return <p>{translate('module.notFound') || 'Module not found.'}</p>;
    }

    return (
      // Added aria-labelledby for the main module container
      <div className="module" aria-labelledby="module-title"> 
        <h2 id="module-title" tabIndex={-1}>{moduleData.nom || moduleData.titre}</h2> {/* Ensure h2 has an id and is focusable if needed, -1 makes it script-focusable */}
        
        {/* Assuming moduleData.contenu is safe HTML; otherwise, sanitize or use a different rendering method */}
        <div dangerouslySetInnerHTML={{ __html: moduleData.contenu }} />

        {documentUrl && (
          <p>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer">
              {translate('module.viewDocument') || 'View Document'}
            </a>
          </p>
        )}
        
        <VideoPlayer 
          videoSrc={moduleData?.video_url || moduleData?.audio_fr || "/videos/module_default.mp4"} // Example: prefer video_url, fallback to audio_fr or default
          subtitlesSrc={moduleData?.subtitles_fr || "/subtitles/module_default.vtt"}
        />

        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label={translate('module.progressBarLabel') || 'Module Progress'}>
          <div className="progress-indicator" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
        </div>
        <span className="progress-label">{progress}% {translate('module.completed')}</span>

        <div className="notes-section">
          <label htmlFor="module-notes">{translate('module.notesLabel') || 'My Notes:'}</label>
          <textarea 
            id="module-notes" 
            value={notes} 
            onChange={handleNoteChange} 
            rows="5" 
            aria-label={translate('module.notesAriaLabel') || 'Personal notes for this module'} 
          />
        </div>

        {!quizCompleted && !showQuiz && (
          <button onClick={handleModuleCompletion} className="button-quiz">
            {translate('module.completeAndShowQuiz') || 'Complete Module & Show Quiz'}
          </button>
        )}

        {showQuiz && !quizCompleted && moduleData.quiz && (
          <Quiz quizData={moduleData.quiz.questions || moduleData.quiz} onQuizComplete={handleQuizCompletion} />
        )}
        
        {quizCompleted && (
          <div role="alert" className="quiz-completed-message">
            <p>{translate('module.quizCompleted') || 'Quiz completed!'}</p>
            <p>{translate('module.yourScore') || 'Your score'}: {quizScore}%</p>
          </div>
        )}

        <h3 id="other-modules-heading" tabIndex={-1}>{translate('module.otherModules') || 'Other Modules'}</h3>
        <nav aria-labelledby="other-modules-heading">
          <ul>
            {modules
              // Ensure module._id is used for filtering and key if modules come from DB
              .filter((m) => m._id !== moduleId && m.id !== parseInt(moduleId, 10)) 
              .map((m) => (
                <li key={m._id || m.id}>
                  <Link to={`/module/${m._id || m.id}`}>{m.nom}</Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    );
  }

  export default Module;