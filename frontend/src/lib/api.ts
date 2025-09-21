import { api } from './auth';

export interface Question {
  id?: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options?: string[];
  correctAnswer?: string;
  points: number;
  order?: number;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  isActive?: boolean;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateExamData {
  title: string;
  description?: string;
  timeLimit?: number;
  questions: Question[];
}

export interface ExamResponse {
  id: string;
  studentName?: string;
  studentEmail?: string;
  answers: { questionId: string; answer: string }[];
  score?: number;
  submittedAt: string;
  exam: {
    id: string;
    title: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    exams: number;
  };
}

export const examService = {
  async createExam(data: CreateExamData): Promise<Exam> {
    const response = await api.post('/exams', data);
    return response.data.data.exam;
  },

  async getExams(page = 1, limit = 10): Promise<{ exams: Exam[]; pagination: any }> {
    const response = await api.get(`/exams?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  async getExam(id: string): Promise<Exam> {
    const response = await api.get(`/exams/${id}`);
    return response.data.data.exam;
  },

  async updateExam(id: string, data: Partial<CreateExamData>): Promise<Exam> {
    const response = await api.put(`/exams/${id}`, data);
    return response.data.data.exam;
  },

  async deleteExam(id: string): Promise<void> {
    await api.delete(`/exams/${id}`);
  },

  async getPublicExam(shareLink: string): Promise<Exam> {
    const response = await api.get(`/exams/public/${shareLink}`);
    return response.data.data.exam;
  },

  async getExamResponses(examId: string, page = 1, limit = 10): Promise<{ responses: ExamResponse[]; pagination: any }> {
    const response = await api.get(`/responses/exam/${examId}?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  async submitResponse(shareLink: string, data: {
    studentName?: string;
    studentEmail?: string;
    answers: { questionId: string; answer: string }[];
  }): Promise<ExamResponse> {
    const response = await api.post(`/responses/submit/${shareLink}`, data);
    return response.data.data.response;
  },

  async updateResponseScore(responseId: string, score: number): Promise<ExamResponse> {
    const response = await api.put(`/responses/${responseId}/score`, { score });
    return response.data.data.response;
  },
};

export const userService = {
  async getAllUsers(page = 1, limit = 10, search = ''): Promise<{ users: User[]; pagination: any }> {
    const response = await api.get(`/auth/users?page=${page}&limit=${limit}&search=${search}`);
    return response.data.data;
  },
};