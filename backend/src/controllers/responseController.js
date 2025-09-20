const { validationResult } = require('express-validator');
const prisma = require('../utils/database');

const submitResponse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { shareLink } = req.params;
    const { studentName, studentEmail, answers } = req.body;

    // Get exam with questions
    const exam = await prisma.exam.findUnique({
      where: { 
        shareLink,
        isActive: true 
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or inactive'
      });
    }

    // Calculate score for auto-gradable questions
    let score = 0;
    let totalPoints = 0;
    const processedAnswers = [];

    for (const question of exam.questions) {
      totalPoints += question.points;
      const studentAnswer = answers.find(a => a.questionId === question.id);
      
      if (studentAnswer) {
        let isCorrect = false;
        
        // Auto-grade multiple choice and true/false questions
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          if (question.correctAnswer && studentAnswer.answer === question.correctAnswer) {
            isCorrect = true;
            score += question.points;
          }
        }
        // For short answer and essay, manual grading is required
        else if (question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') {
          // These will need manual grading, so we don't add to score yet
        }

        processedAnswers.push({
          questionId: question.id,
          answer: studentAnswer.answer,
          isCorrect
        });
      }
    }

    // Create response with answers in a transaction
    const response = await prisma.$transaction(async (tx) => {
      const newResponse = await tx.response.create({
        data: {
          studentName,
          studentEmail,
          score,
          totalPoints,
          examId: exam.id
        }
      });

      // Create answers
      if (processedAnswers.length > 0) {
        const answersData = processedAnswers.map(a => ({
          questionId: a.questionId,
          answer: a.answer,
          responseId: newResponse.id
        }));

        await tx.answer.createMany({
          data: answersData
        });
      }

      return newResponse;
    });

    // Get the complete response with answers
    const completeResponse = await prisma.response.findUnique({
      where: { id: response.id },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                correctAnswer: true,
                points: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Response submitted successfully',
      data: { 
        response: completeResponse,
        score,
        totalPoints,
        percentage: totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getExamResponses = async (req, res) => {
  try {
    const { examId } = req.params;
    const authorId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Verify exam belongs to the authenticated user
    const exam = await prisma.exam.findFirst({
      where: { 
        id: examId,
        authorId 
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [responses, total] = await Promise.all([
      prisma.response.findMany({
        where: { examId },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  id: true,
                  question: true,
                  type: true,
                  correctAnswer: true,
                  points: true
                }
              }
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.response.count({
        where: { examId }
      })
    ]);

    res.json({
      success: true,
      data: {
        responses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get exam responses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateResponseScore = async (req, res) => {
  try {
    const { responseId } = req.params;
    const { score } = req.body;
    const authorId = req.user.id;

    // Verify the response belongs to an exam owned by the authenticated user
    const response = await prisma.response.findUnique({
      where: { id: responseId },
      include: {
        exam: {
          select: { authorId: true }
        }
      }
    });

    if (!response || response.exam.authorId !== authorId) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    const updatedResponse = await prisma.response.update({
      where: { id: responseId },
      data: { score },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                points: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Response score updated successfully',
      data: { response: updatedResponse }
    });
  } catch (error) {
    console.error('Update response score error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitResponse,
  getExamResponses,
  updateResponseScore,
};