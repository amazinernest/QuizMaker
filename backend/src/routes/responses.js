const express = require('express');
const { body, param } = require('express-validator');
const { 
  submitResponse, 
  getExamResponses, 
  updateResponseScore 
} = require('../controllers/responseController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const submitResponseValidation = [
  body('studentName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Student name must be less than 100 characters'),
  body('studentEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers are required and must be an array'),
  body('answers.*.questionId')
    .isLength({ min: 1 })
    .withMessage('Question ID is required for each answer'),
  body('answers.*.answer')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Answer is required')
];

const updateScoreValidation = [
  body('score')
    .isInt({ min: 0 })
    .withMessage('Score must be a non-negative integer')
];

const shareLinkValidation = [
  param('shareLink')
    .isLength({ min: 1 })
    .withMessage('Valid share link is required')
];

const examIdValidation = [
  param('examId')
    .isLength({ min: 1 })
    .withMessage('Valid exam ID is required')
];

const responseIdValidation = [
  param('responseId')
    .isLength({ min: 1 })
    .withMessage('Valid response ID is required')
];

// Public routes (for students)
router.post('/submit/:shareLink', shareLinkValidation, submitResponseValidation, submitResponse);

// Protected routes (for tutors)
router.get('/exam/:examId', authenticateToken, examIdValidation, getExamResponses);
router.put('/:responseId/score', authenticateToken, responseIdValidation, updateScoreValidation, updateResponseScore);

module.exports = router;