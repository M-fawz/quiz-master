/**
 * @fileoverview Quiz class — manages game state, API, scoring, leaderboard
 */

import {
  API_BASE_URL, API_SUCCESS_CODE,
  STORAGE_KEY_HIGH_SCORES, MAX_HIGH_SCORES, TIMER_DURATION
} from './constants.js';
import { soundManager } from './sounds.js';

export default class Quiz {

  /**
   * @param {string} category          - API category ID ('9','27',...) or '' for random
   * @param {string} difficulty        - 'easy' | 'medium' | 'hard'
   * @param {number} numberOfQuestions - 1–50
   * @param {string} playerName        - displayed in leaderboard
   */
  constructor(category, difficulty, numberOfQuestions, playerName = 'Player') {
    this.category             = category;
    this.difficulty           = difficulty;
    this.numberOfQuestions    = parseInt(numberOfQuestions, 10);
    this.playerName           = playerName;
    this.score                = 0;
    this.streak               = 0;
    this.maxStreak            = 0;
    this.questions            = [];
    this.currentQuestionIndex = 0;
    this.timerDuration        = TIMER_DURATION;
    this.startTime            = null;
  }

  // ─── API ────────────────────────────────────────────────────────

  /**
   * Fetches questions from Open Trivia DB.
   * Stores them in this.questions.
   * Throws a human-readable Error on failure.
   */
  async getQuestions() {
    try {
      const url      = this.buildApiUrl();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response_code !== API_SUCCESS_CODE) {
        throw new Error(this.getApiErrorMessage(data.response_code));
      }

      this.questions = data.results;
      this.startTime = Date.now();
      return this.questions;
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      throw error;
    }
  }

  /** Builds the API URL with query parameters */
  buildApiUrl() {
    const params = new URLSearchParams({
      amount:     this.numberOfQuestions,
      difficulty: this.difficulty,
    });
    if (this.category) {
      params.append('category', this.category);
    }
    return `${API_BASE_URL}?${params.toString()}`;
  }

  /** Maps API response codes to human-readable messages */
  getApiErrorMessage(code) {
    const messages = {
      1: 'Not enough questions available. Try reducing the number or changing the category.',
      2: 'Invalid parameter in request.',
      3: 'Session token not found.',
      4: 'All available questions have been used. Please try again.',
    };
    return messages[code] || 'An unknown API error occurred.';
  }

  // ─── Scoring ────────────────────────────────────────────────────

  incrementScore()  { this.score += 1; }

  incrementStreak() {
    this.streak++;
    if (this.streak > this.maxStreak) this.maxStreak = this.streak;
  }

  resetStreak() { this.streak = 0; }

  // ─── Navigation ─────────────────────────────────────────────────

  getCurrentQuestion() {
    return this.currentQuestionIndex < this.questions.length
      ? this.questions[this.currentQuestionIndex]
      : null;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    return this.currentQuestionIndex < this.questions.length;
  }

  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }

  // ─── High Scores ────────────────────────────────────────────────

  getScorePercentage() {
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }

  getHighScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HIGH_SCORES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  isHighScore() {
    const scores = this.getHighScores();
    if (scores.length < MAX_HIGH_SCORES) return true;
    return this.getScorePercentage() > scores[scores.length - 1].percentage;
  }

  saveHighScore() {
    const scores = this.getHighScores();
    scores.push({
      name:       this.playerName,
      score:      this.score,
      total:      this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      category:   this.category || 'Any',
      date:       new Date().toLocaleDateString(),
    });
    scores.sort((a, b) => b.percentage - a.percentage);
    scores.splice(MAX_HIGH_SCORES);
    localStorage.setItem(STORAGE_KEY_HIGH_SCORES, JSON.stringify(scores));
  }

  // ─── End Screen ─────────────────────────────────────────────────

  /**
   * Generates the HTML for the results screen.
   * @returns {string} HTML string
   */
  endQuiz() {
    soundManager.playComplete();

    const percentage     = this.getScorePercentage();
    const isNewHighScore = this.isHighScore();

    // Save FIRST so the new score appears in the leaderboard
    if (isNewHighScore) this.saveHighScore();

    // Read AFTER saving
    const highScores = this.getHighScores();

    const leaderboardHtml = highScores.length > 0 ? `
      <div class="leaderboard">
        <h4 class="leaderboard-title">
          <i class="fa-solid fa-trophy"></i> Leaderboard
        </h4>
        <ul class="leaderboard-list">
          ${highScores.slice(0, 10).map((hs, i) => {
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            return `
              <li class="leaderboard-item ${rankClass}">
                <span class="leaderboard-rank">#${i + 1}</span>
                <span class="leaderboard-name">${hs.name}</span>
                <span class="leaderboard-score">${hs.percentage}%</span>
              </li>`;
          }).join('')}
        </ul>
      </div>` : '';

    return `
      <div class="game-card results-card" role="dialog" aria-labelledby="gameResult">
        <h2 id="gameResult" class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>
        ${isNewHighScore ? `
          <div class="new-record-badge">
            <i class="fa-solid fa-star"></i> New High Score!
          </div>` : ''}
        ${leaderboardHtml}
        <div class="action-buttons">
          <button class="btn-restart" aria-label="Play again">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>`;
  }

  // ─── Reset ──────────────────────────────────────────────────────

  reset() {
    this.score                = 0;
    this.streak               = 0;
    this.maxStreak            = 0;
    this.questions            = [];
    this.currentQuestionIndex = 0;
    this.startTime            = null;
  }
}
