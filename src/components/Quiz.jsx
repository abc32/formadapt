import React, { useState, useEffect } from 'react';
  import translate from '../i18n';
  import ApiError from './ApiError';

  function Quiz({ moduleId, onQuizCompletion }) {
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchQuiz = async () => {
        try {
          const response = await fetch(`/api/module/quiz/${moduleId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch quiz');
          }
          const data = await response.json();
          setQuestions(data.questions);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchQuiz();
    }, [moduleId]);

    const handleAnswer = (questionId, answer) => {
      setUserAnswers({ ...userAnswers, [questionId]: answer });
    };

    const handleSubmitQuiz = () => {
      let newScore = 0;
      questions.forEach((question) => {
        if (userAnswers[question.id] === question.answer) {
          newScore += 1;
        }
      });
      setScore(newScore);
      setShowResults(true);
      onQuizCompletion(newScore);
    };

    const handleNextQuestion = () => {
      setCurrentQuestion(currentQuestion + 1);
    }

    if (showResults) {
      return (
        // Added role="alert" and aria-live for results announcement
        <div role="alert" aria-live="assertive"> 
          <h2>{translate('quiz.title')}</h2>
          <p>{translate('quiz.yourScore', { score, total: questions.length }) || `Your score: ${score} / ${questions.length}`}</p>
        </div>
      );
    }

    const question = questions[currentQuestion];

    if (!question) {
      return <p>Chargement des questions...</p>
    }

    return (
      <div>
      {/* Removed tabIndex from h2, as it's a heading, not interactive. */}
      <h2 id="quiz-title">{translate('quiz.title')}</h2> 
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(); }}>
        {/* Using fieldset and legend for better semantics for question and options */}
        <fieldset>
          <legend id={`question-${question.id}-label`}>{currentQuestion + 1}. {question.question}</legend>
          {/* The role="radiogroup" is now on the fieldset or can be on a div wrapping the ul if ul is preferred over direct children of fieldset for styling */}
          <ul className="quiz-options" role="radiogroup" aria-labelledby={`question-${question.id}-label`}>
            {question.options.map((option, index) => (
              // Added a more unique key using index as options could be non-unique strings in some cases
              <li key={`${question.id}-option-${index}`}> 
                <label htmlFor={`question-${question.id}-option-${index}`}>
                    <input
                      type="radio"
                    id={`question-${question.id}-option-${index}`}
                    name={`question-${question.id}`} // Radios in a group must have the same name
                      value={option}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      checked={userAnswers[question.id] === option}
                    // aria-describedby if there's any specific description for this option
                    />
                    {option}
                  </label>
                </li>
              ))}
            </ul>
        </fieldset>
          {currentQuestion < questions.length - 1 ? (
          <button type="button" onClick={handleNextQuestion} disabled={!userAnswers[question.id]} className="quiz-button next">
            {translate('quiz.nextQuestion') || 'Next Question'}
          </button>
          ) : (
          <button type="submit" disabled={Object.keys(userAnswers).length !== questions.length} className="quiz-button submit"> 
            {/* Ensure all questions are answered before enabling submit if that's the logic */}
            {translate('quiz.submitQuiz') || 'Submit Quiz'}
          </button>
          )}
        </form>
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default Quiz;
