import React, { useParams, Link } from 'react-router-dom';
import './Module.css';
import { useEffect, useState } from 'react';
import Quiz from './Quiz.jsx';
import { useI18n } from '../i18n'; // Import useI18n
import VideoPlayer from './VideoPlayer.jsx';
import ApiError from './ApiError';
import { fetchWithAuth } from '../utils/api'; // Import fetchWithAuth

function Module() {
  const { moduleId } = useParams();
  const { translate } = useI18n(); // Get translate function from hook
  const [moduleData, setModuleData] = useState(null);
  const [modules, setModules] = useState([]); // For "Other modules" navigation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [notes, setNotes] = useState(''); // Initialize empty, load from localStorage in useEffect
  const [documentUrl, setDocumentUrl] = useState('');
  const [quizScore, setQuizScore] = useState(null);

  // Effect for loading notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`module-${moduleId}-notes`) || '';
    setNotes(savedNotes);
  }, [moduleId]);

  // Effect for saving notes to localStorage
  useEffect(() => {
    localStorage.setItem(`module-${moduleId}-notes`, notes);
  }, [notes, moduleId]);
  
  // Effect for fetching module data, related modules, document, and initial progress
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [moduleRes, modulesListRes, documentRes] = await Promise.all([
          fetchWithAuth(`/api/module/${moduleId}`),
          fetchWithAuth('/api/modules'), 
          fetchWithAuth(`/api/module/document/${moduleId}`)
        ]);

        if (!moduleRes.ok) {
            const errorData = await moduleRes.json().catch(() => ({})); // Try to get error message from body
            throw new Error(errorData.message || `Failed to fetch module data: ${moduleRes.statusText} (${moduleRes.status})`);
        }
        const moduleResult = await moduleRes.json();
        setModuleData(moduleResult);
        // Assuming moduleData might contain initial progress and score
        setProgress(moduleResult.progress || 0); 
        setQuizScore(moduleResult.score || null);
        if (moduleResult.progress === 100 && moduleResult.score !== null) {
            setQuizCompleted(true); // If progress is 100 and score exists, quiz is completed
        }


        if (!modulesListRes.ok) {
            const errorData = await modulesListRes.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch modules list: ${modulesListRes.statusText} (${modulesListRes.status})`);
        }
        const modulesListResult = await modulesListRes.json();
        setModules(modulesListResult);
        
        if (documentRes.ok) {
            const documentResult = await documentRes.json();
            setDocumentUrl(documentResult.document);
        } else if (documentRes.status === 404) { // Gracefully handle no document
            setDocumentUrl(''); 
            console.log(`No document found for module ${moduleId}`);
        } else { // Other errors for document fetch
            const errorData = await documentRes.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch module document: ${documentRes.statusText} (${documentRes.status})`);
        }
        
      } catch (err) {
        console.error("Module.jsx fetchData error:", err);
        if (err.message !== 'Unauthorized') { // Unauthorized is handled by fetchWithAuth redirect
            setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [moduleId]);

  // Function to update progress and score on the backend
  const updateBackendProgress = async (newProgress, newScore) => {
    try {
      const response = await fetchWithAuth(`/api/module/${moduleId}`, { // Backend POST endpoint for updates
        method: 'POST',
        body: JSON.stringify({ progress: newProgress, score: newScore }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Failed to update progress on backend for module ${moduleId}: ${errorData.message || response.statusText}`);
      } else {
        console.log(`Progress for module ${moduleId} updated to ${newProgress}%, score ${newScore}`);
      }
    } catch (err) {
      console.error("Module.jsx updateBackendProgress error:", err);
      if (err.message !== 'Unauthorized') {
         // Optionally set an error for the user if feedback for failed sync is critical
         // setError(`Failed to sync progress: ${err.message}`); 
         console.error(`Failed to sync progress: ${err.message}`);
      }
    }
  };

  const handleNoteChange = (event) => {
    setNotes(event.target.value);
  };

  // Called when user clicks "Finish module and start quiz"
  const handleModuleContentCompletion = () => {
    if (!quizCompleted) {
      const currentProgress = progress < 80 ? 80 : progress; // Example: set to 80 if not already past it
      setProgress(currentProgress);
      updateBackendProgress(currentProgress, quizScore); // quizScore might be null here
      setShowQuiz(true);
    }
  };

  // Called when quiz is submitted/completed
  const handleQuizCompletion = (scoreFromQuiz) => {
    setQuizCompleted(true);
    setQuizScore(scoreFromQuiz);
    const finalProgress = 100;
    setProgress(finalProgress);
    updateBackendProgress(finalProgress, scoreFromQuiz);
    setShowQuiz(false); // Hide quiz component after completion
  };

  if (loading) {
    return <p>{translate('module.loading', 'Loading module...')}</p>;
  }

  if (error) {
    return <ApiError message={error} />;
  }

  if (!moduleData) {
    return <p>{translate('module.notFound', 'Module not found.')}</p>;
  }

  const moduleName = moduleData.nom || translate('module.defaultTitle', 'Module');

  return (
    <div className="module">
      <h2 id="module-title">{moduleName}</h2>
      {/* Ensure moduleData.contenu is sanitized if it comes from user input.
          For now, assuming it's safe HTML from trusted source. */}
      <div aria-labelledby="module-title" dangerouslySetInnerHTML={{ __html: moduleData.contenu }} />

      {documentUrl && (
        <p>
          <a href={documentUrl} target="_blank" rel="noopener noreferrer" download>
            {translate('module.downloadDocument', 'Download Document')}
          </a>
        </p>
      )}
      
      {/* Placeholder for VideoPlayer. Assuming moduleData provides videoSrc and subtitlesSrc if applicable */}
      {/* moduleData.videoSrc && <VideoPlayer videoSrc={moduleData.videoSrc} subtitlesSrc={moduleData.subtitlesSrc} /> */}

      <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label={translate('module.progressLabel', { progress: progress }, `Module progress: ${progress}%`)}>
        <div className="progress-indicator" style={{ width: `${progress}%` }}></div>
        <span className="progress-label">{progress}% {translate('module.completed', 'completed')}</span>
      </div>

      {!quizCompleted && !showQuiz && (
        <button onClick={handleModuleContentCompletion} className="start-quiz-button">
          {translate('module.startQuiz', 'Finish module and start quiz')}
        </button>
      )}

      {showQuiz && !quizCompleted && (
        <Quiz moduleId={parseInt(moduleId, 10)} onQuizComplete={handleQuizCompletion} />
      )}

      {quizCompleted && (
        <div className="quiz-completed-message">
          <p>{translate('module.quizCompleted', 'Quiz completed!')}</p>
          <p>{translate('module.yourScoreIs', { score: quizScore }, `Your score: ${quizScore}`)}</p>
        </div>
      )}

      <div className="notes-section">
        <h3>{translate('module.notes', 'My notes')}</h3>
        <textarea
          value={notes}
          onChange={handleNoteChange}
          aria-label={translate('module.notesLabel', 'Text area for notes')}
          rows="5"
          cols="50"
          placeholder={translate('module.notesPlaceholder', 'Type your notes here...')}
        />
      </div>
      
      <h3 id="other-modules-heading">{translate('module.otherModules', 'Other modules')}</h3>
      <nav aria-labelledby="other-modules-heading">
        <ul>
          {modules && modules
            .filter((m) => m.id !== parseInt(moduleId, 10)) // Ensure m.id is compared correctly
            .slice(0, 5) // Limit to 5 other modules for brevity
            .map((m) => (
              <li key={m.id}>
                <Link to={`/module/${m.id}`}>{m.nom}</Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}

export default Module;
