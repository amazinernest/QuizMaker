const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/database');

const createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, timeLimit, questions } = req.body;
    const authorId = req.user.id;

    // Create exam with questions in a transaction
    const exam = await prisma.$transaction(async (tx) => {
      // Create the exam
      const newExam = await tx.exam.create({
        data: {
          title,
          description,
          timeLimit,
          authorId,
          shareLink: uuidv4()
        }
      });

      // Create questions if provided
      if (questions && questions.length > 0) {
        const questionsData = questions.map((q, index) => ({
          type: q.type,
          question: q.question,
          options: q.options || null,
          correctAnswer: q.correctAnswer || null,
          points: q.points || 1,
          order: index + 1,
          examId: newExam.id
        }));

        await tx.question.createMany({
          data: questionsData
        });
      }

      return newExam;
    });

    // Fetch the complete exam with questions
    const completeExam = await prisma.exam.findUnique({
      where: { id: exam.id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { exam: completeExam }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getExams = async (req, res) => {
  try {
    const authorId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where: { authorId },
        include: {
          questions: {
            select: { id: true, type: true, points: true }
          },
          _count: {
            select: { responses: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.exam.count({
        where: { authorId }
      })
    ]);

    res.json({
      success: true,
      data: {
        exams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getExam = async (req, res) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const exam = await prisma.exam.findFirst({
      where: { 
        id,
        authorId 
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        responses: {
          include: {
            answers: {
              include: {
                question: {
                  select: { id: true, question: true, type: true, points: true }
                }
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    res.json({
      success: true,
      data: { exam }
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, timeLimit, isActive } = req.body;
    const authorId = req.user.id;

    // Check if exam exists and belongs to user
    const existingExam = await prisma.exam.findFirst({
      where: { id, authorId }
    });

    if (!existingExam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        title,
        description,
        timeLimit,
        isActive
      },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: { exam: updatedExam }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    // Check if exam exists and belongs to user
    const existingExam = await prisma.exam.findFirst({
      where: { id, authorId }
    });

    if (!existingExam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    await prisma.exam.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Public route for students to access exam
const getPublicExam = async (req, res) => {
  try {
    const { shareLink } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { 
        shareLink,
        isActive: true 
      },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            points: true,
            order: true
          },
          orderBy: { order: 'asc' }
        },
        author: {
          select: { name: true }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or inactive'
      });
    }

    res.json({
      success: true,
      data: { exam }
    });
  } catch (error) {
    console.error('Get public exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  getPublicExam,
};