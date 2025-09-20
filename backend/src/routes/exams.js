const express = require('express');
const { body, param } = require('express-validator');
const { 
  createExam, 
  getExams, 
  getExam, 
  updateExam, 
  deleteExam, 
  getPublicExam 
} = require('../controllers/examController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const examValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('timeLimit')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Time limit must be between 1 and 480 minutes'),
  body('questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
  body('questions.*.type')
    .optional()
    .isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'])
    .withMessage('Invalid question type'),
  body('questions.*.question')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question text is required and must be less than 1000 characters'),
  body('questions.*.points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Points must be between 1 and 100')
];

const updateExamValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('timeLimit')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Time limit must be between 1 and 480 minutes'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const idValidation = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('Valid exam ID is required')
];

const shareLinkValidation = [
  param('shareLink')
    .isLength({ min: 1 })
    .withMessage('Valid share link is required')
];

// Protected routes (require authentication)
router.post('/', authenticateToken, examValidation, createExam);
router.get('/', authenticateToken, getExams);
router.get('/:id', authenticateToken, idValidation, getExam);
router.put('/:id', authenticateToken, idValidation, updateExamValidation, updateExam);
router.delete('/:id', authenticateToken, idValidation, deleteExam);

// Public routes (for students)
router.get('/public/:shareLink', shareLinkValidation, getPublicExam);

module.exports = router;