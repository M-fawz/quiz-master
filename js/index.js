/**
 * @fileoverview Main entry point — wires up the form, loading state, and quiz lifecycle.
 */

import Quiz     from './quiz.js';
import Question from './question.js';
import { soundManager }   from './sounds.js';
import { MIN_QUESTIONS, MAX_QUESTIONS } from './constants.js';

// ─── DOM References ─────────────────────────────────────────────────────────

const quizOptionsForm    = document.getElementById('quizOptions');
const playerNameInput    = document.getElementById('playerName');
const categoryInput      = document.getElementById('categoryMenu');
const difficultyOptions  = document.getElementById('difficultyOptions');
const questionsNumber    = document.getElementById('questionsNumber');
const startQuizBtn       = document.getElementById('startQuiz');
const questionsContainer = document.querySelector('.questions-container');

// ─── State ──────────────────────────────────────────────────────────────────

let currentQuiz = null;

// ─── Loading ────────────────────────────────────────────────────────────────

function showLoading() {
  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>`;
}

function hideLoading() {
  const overlay = questionsContainer.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Error ──────────────────────────────────────────────────────────────────

function showError(message) {
  const safeMessage = escapeHtml(message);
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something Went Wrong</h3>
      <p class="error-message">${safeMessage}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>`;

  const retryBtn = questionsContainer.querySelector('.retry-btn');
  retryBtn?.addEventListener('click', resetToStart);
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateForm() {
  const value = parseInt(questionsNumber.value, 10);

  if (!questionsNumber.value || isNaN(value)) {
    return { isValid: false, error: 'Please enter the number of questions.' };
  }
  if (value < MIN_QUESTIONS) {
    return { isValid: false, error: `Minimum number of rounds is ${MIN_QUESTIONS}.` };
  }
  if (value > MAX_QUESTIONS) {
    return { isValid: false, error: `Maximum number of rounds is ${MAX_QUESTIONS}.` };
  }

  return { isValid: true, error: null };
}

function showFormError(message) {
  // Remove any existing error first
  document.querySelector('.form-error')?.remove();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;

  startQuizBtn.before(errorDiv);

  setTimeout(() => {
    errorDiv.style.transition = 'opacity 0.5s ease';
    errorDiv.style.opacity    = '0';
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

// ─── Reset ──────────────────────────────────────────────────────────────────

function resetToStart() {
  questionsContainer.innerHTML = '';
  quizOptionsForm.classList.remove('hidden');
  currentQuiz = null;
  // Scroll back to top so the form is visible
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Start Quiz ─────────────────────────────────────────────────────────────

async function startQuiz() {
  const validation = validateForm();
  if (!validation.isValid) {
    showFormError(validation.error);
    return;
  }

  // Initialize audio context on first user interaction
  soundManager.init();

  const playerName        = playerNameInput.value.trim() || 'Player';
  const category          = categoryInput.value;
  const difficulty        = difficultyOptions.value;
  const numberOfQuestions = parseInt(questionsNumber.value, 10);

  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);

  // Hide form, show loader
  quizOptionsForm.classList.add('hidden');
  showLoading();

  try {
    await currentQuiz.getQuestions();
    hideLoading();

    if (!currentQuiz.questions || currentQuiz.questions.length === 0) {
      showError('No questions were returned. Please try different settings.');
      quizOptionsForm.classList.remove('hidden');
      return;
    }

    const firstQuestion = new Question(currentQuiz, questionsContainer, resetToStart);
    firstQuestion.displayQuestion();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to load questions. Please check your connection and try again.');
  }
}

// ─── Event Listeners ────────────────────────────────────────────────────────

startQuizBtn.addEventListener('click', startQuiz);

questionsNumber.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startQuiz();
});
