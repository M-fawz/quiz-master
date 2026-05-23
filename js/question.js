/**
 * @fileoverview Question class — display, timer, answer checking, transitions
 */

import {
  ANIMATION_DURATION, QUESTION_TRANSITION_DELAY,
  TIMER_DURATION, TIMER_WARNING_THRESHOLD, ANSWER_KEYS
} from './constants.js';
import { soundManager } from './sounds.js';

export default class Question {

  /**
   * @param {Quiz}        quiz      - The parent Quiz instance (shared state)
   * @param {HTMLElement} container - The .questions-container DOM element
   * @param {Function}    onQuizEnd - Callback: called when "Play Again" is clicked
   */
  constructor(quiz, container, onQuizEnd) {
    this.quiz         = quiz;
    this.container    = container;
    this.onQuizEnd    = onQuizEnd;

    this.questionData  = quiz.getCurrentQuestion();
    this.index         = quiz.currentQuestionIndex;
    this.question      = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category      = this.decodeHtml(this.questionData.category);
    this.wrongAnswers  = this.questionData.incorrect_answers.map(a => this.decodeHtml(a));
    this.allAnswers    = this.shuffleAnswers();

    this.answered        = false;
    this.timerInterval   = null;
    this.timeRemaining   = TIMER_DURATION;
    this.keyboardHandler = null;
  }

  // ─── Helpers ────────────────────────────────────────────────────

  /**
   * Decodes HTML entities returned by the API (e.g. &amp; → &, &quot; → ").
   * Returns a plain-text string — NOT safe to inject into innerHTML as-is.
   */
  decodeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
  }

  /**
   * Re-encodes a plain-text string so it is safe to embed inside an
   * innerHTML template literal or an HTML attribute value.
   *
   * Why this is necessary: after decodeHtml() we have raw characters
   * (e.g. "<", ">", "&"). If those characters are injected directly into a
   * template string that feeds innerHTML they are mis-parsed as HTML tags,
   * breaking the DOM and silently corrupting the answer-comparison logic.
   *
   * The data-answer attribute stores the escaped version; the browser
   * automatically decodes HTML entities when you read dataset.answer, so
   * comparisons with this.correctAnswer (plain text) still work correctly.
   */
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  shuffleAnswers() {
    const arr = [...this.wrongAnswers, this.correctAnswer];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  getProgress() {
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  getDifficultyIcon() {
    const icons = { easy: 'fa-face-smile', medium: 'fa-face-meh', hard: 'fa-skull' };
    return icons[this.quiz.difficulty] || 'fa-gauge-high';
  }

  // ─── Display ────────────────────────────────────────────────────

  displayQuestion() {
    // Pre-escape every API-sourced string before interpolating into HTML
    const safeQuestion  = this.escapeHtml(this.question);
    const safeCategory  = this.escapeHtml(this.category);
    const progress      = this.getProgress();
    const diffIcon      = this.getDifficultyIcon();
    const safeDifficulty = this.escapeHtml(this.quiz.difficulty);

    const html = `
      <div class="game-card question-card"
           role="region"
           aria-label="Round ${this.index + 1} of ${this.quiz.numberOfQuestions}">

        <!-- Progress Bar -->
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label">
              <i class="fa-solid fa-bolt"></i> Progress
            </span>
            <span class="xp-value">
              Round ${this.index + 1}/${this.quiz.numberOfQuestions}
            </span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill"
                 style="width: ${progress}%"
                 role="progressbar"
                 aria-valuenow="${progress}"
                 aria-valuemin="0"
                 aria-valuemax="100">
            </div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${safeCategory}</span>
          </div>
          <div class="stat-badge difficulty ${safeDifficulty}">
            <i class="fa-solid ${diffIcon}"></i>
            <span>${safeDifficulty}</span>
          </div>
          <div class="stat-badge timer" aria-live="polite" aria-label="Time remaining">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
        </div>

        <!-- Question Text -->
        <h2 class="question-text" id="questionText">${safeQuestion}</h2>

        <!-- Answer Buttons -->
        <div class="answers-grid" role="listbox" aria-labelledby="questionText">
          ${this.allAnswers.map((choice, i) => {
            const safeChoice = this.escapeHtml(choice);
            return `
            <button
              class="answer-btn"
              role="option"
              tabindex="0"
              data-index="${i}"
              data-answer="${safeChoice}"
              aria-label="Answer ${i + 1}: ${safeChoice}. Press ${i + 1} to select.">
              <span class="answer-key">${i + 1}</span>
              <span class="answer-text">${safeChoice}</span>
            </button>`;
          }).join('')}
        </div>

        <!-- Keyboard Hint -->
        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i>
          Press 1-${this.allAnswers.length} to select
        </p>

        <!-- Score Panel -->
        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>

      </div>`;

    this.container.innerHTML = html;
    this.addEventListeners();
    this.startTimer();
  }

  // ─── Events ─────────────────────────────────────────────────────

  addEventListeners() {
    const allChoices = document.querySelectorAll('.answer-btn');

    allChoices.forEach(choice => {
      choice.addEventListener('click', () => this.checkAnswer(choice));
      choice.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.checkAnswer(choice);
        }
      });
    });

    this.keyboardHandler = (e) => {
      if (ANSWER_KEYS.includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < allChoices.length) {
          this.checkAnswer(allChoices[idx]);
        }
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
  }

  removeEventListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  // ─── Timer ──────────────────────────────────────────────────────

  startTimer() {
    const timerDisplay = document.querySelector('.timer-value');
    const timerBadge   = document.querySelector('.stat-badge.timer');

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      if (timerDisplay) timerDisplay.textContent = this.timeRemaining;

      if (this.timeRemaining <= TIMER_WARNING_THRESHOLD) {
        timerBadge?.classList.add('warning');
        soundManager.playWarning();
      }

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (!this.answered) {
          soundManager.playTimeUp();
          this.handleTimeUp();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    this.answered = true;
    this.removeEventListeners();
    this.quiz.resetStreak();

    // dataset.answer is browser-decoded (plain text), matching this.correctAnswer
    document.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn.dataset.answer === this.correctAnswer) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('disabled');
      }
    });

    const scorePanel = this.container.querySelector('.score-panel');
    const msg = document.createElement('div');
    msg.className = 'time-up-message';
    msg.innerHTML = '<i class="fa-solid fa-clock"></i> TIME\'S UP!';
    scorePanel?.before(msg);

    this.animateQuestion(ANIMATION_DURATION);
  }

  // ─── Answer Checking ────────────────────────────────────────────

  checkAnswer(choiceElement) {
    if (this.answered) return;

    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();

    // dataset.answer is automatically HTML-decoded by the browser,
    // so it equals the plain-text this.correctAnswer directly
    const selected  = choiceElement.dataset.answer;
    const isCorrect = selected.toLowerCase() === this.correctAnswer.toLowerCase();

    document.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn !== choiceElement) btn.classList.add('disabled');
    });

    if (isCorrect) {
      choiceElement.classList.add('correct');
      this.quiz.incrementScore();
      this.quiz.incrementStreak();
      soundManager.playCorrect();
    } else {
      choiceElement.classList.add('wrong');
      this.quiz.resetStreak();
      soundManager.playWrong();
      this.highlightCorrectAnswer();
    }

    this.animateQuestion(ANIMATION_DURATION);
  }

  highlightCorrectAnswer() {
    document.querySelectorAll('.answer-btn').forEach(btn => {
      if (btn.dataset.answer === this.correctAnswer) {
        btn.classList.add('correct-reveal');
        btn.classList.remove('disabled');
      }
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const next = new Question(this.quiz, this.container, this.onQuizEnd);
      next.displayQuestion();
    } else {
      this.container.innerHTML = this.quiz.endQuiz();
      const restartBtn = document.querySelector('.btn-restart');
      if (restartBtn) {
        restartBtn.addEventListener('click', () => {
          restartBtn.classList.add('loading');
          restartBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading...';
          setTimeout(() => this.onQuizEnd(), 500);
        });
      }
    }
  }

  animateQuestion(duration) {
    setTimeout(() => {
      const card = this.container.querySelector('.question-card');
      if (card) card.classList.add('exit');
      setTimeout(() => this.getNextQuestion(), duration);
    }, QUESTION_TRANSITION_DELAY);
  }
}
