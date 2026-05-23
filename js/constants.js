/**
 * @fileoverview Centralized constants for the Quiz App
 */

// Animation timing (milliseconds)
export const ANIMATION_DURATION = 500;
export const ANIMATION_DELAY_MULTIPLIER = 2;
export const QUESTION_TRANSITION_DELAY = ANIMATION_DURATION * ANIMATION_DELAY_MULTIPLIER; // 1000ms

// Timer
export const TIMER_DURATION = 15;            // seconds per question
export const TIMER_WARNING_THRESHOLD = 5;    // seconds left when warning triggers

// Quiz limits
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 50;
export const DEFAULT_DIFFICULTY = 'easy';

// localStorage
export const STORAGE_KEY_HIGH_SCORES = 'quizApp_highScores';
export const MAX_HIGH_SCORES = 10;

// API
export const API_BASE_URL = 'https://opentdb.com/api.php';
export const API_SUCCESS_CODE = 0;

// Keyboard shortcuts
export const ANSWER_KEYS = ['1', '2', '3', '4'];
