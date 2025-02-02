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
        <div>
          <h2>{translate('quiz.title')}</h2>
          <p>Votre score : {score} / {questions.length}</p>
        </div>
      );
    }

    const question = questions[currentQuestion];

    if (!question) {
      return <p>Chargement des questions...</p>
    }

    return (
      <div>
        <h2 id="quiz-title" tabIndex={0}>{translate('quiz.title')}</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(); }}>
          <div>
            <p id={`question-${question.id}-label`} tabIndex={0}>{currentQuestion + 1}. {question.question}</p>
            <ul aria-labelledby={`question-${question.id}-label`} role="radiogroup">
              {question.options.map((option) => (
                <li key={option}>
                  <label htmlFor={`question-${question.id}-${option}`}>
                    <input
                      type="radio"
                      id={`question-${question.id}-${option}`}
                      name={`question-${question.id}`}
                      value={option}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      checked={userAnswers[question.id] === option}
                    />
                    {option}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {currentQuestion < questions.length - 1 ? (
            <button type="button" onClick={handleNextQuestion} disabled={!userAnswers[question.id]}>Question suivante</button>
          ) : (
            <button type="submit" disabled={!userAnswers[question.id]}>Soumettre le quiz</button>
          )}
        </form>
        {error && <ApiError message={error} />}
      </div>
    );
  }

  export default Quiz;
