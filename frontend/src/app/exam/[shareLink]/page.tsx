'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { examService, type Exam } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface ExamAnswer {
  questionId: string;
  answer: string;
}

interface ExamSubmission {
  studentName: string;
  studentEmail: string;
  answers: ExamAnswer[];
}

export default function PublicExamPage() {
  const params = useParams();
  const router = useRouter();
  const shareLink = params.shareLink as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [exam, setExam] = useState<Exam | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { register, handleSubmit, formState: { errors } } = useForm<{
    studentName: string;
    studentEmail: string;
  }>();

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setIsLoading(true);
        const examData = await examService.getPublicExam(shareLink);
        setExam(examData);
        if (examData.timeLimit) {
          setTimeLeft(examData.timeLimit * 60); // Convert minutes to seconds
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Exam not found or inactive');
      } finally {
        setIsLoading(false);
      }
    };

    if (shareLink) {
      fetchExam();
    }
  }, [shareLink]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (examStarted && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [examStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startExam = (data: { studentName: string; studentEmail: string }) => {
    setExamStarted(true);
    // Store student info for submission
    setAnswers(prev => ({
      ...prev,
      studentName: data.studentName,
      studentEmail: data.studentEmail
    }));
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleAutoSubmit = async () => {
    if (examSubmitted) return;
    await submitExam();
  };

  const submitExam = async () => {
    if (examSubmitted || !exam) return;
    
    try {
      setIsSubmitting(true);
      
      const examAnswers: ExamAnswer[] = exam.questions.map(question => ({
        questionId: question.id!,
        answer: answers[question.id!] || ''
      }));

      const submission: ExamSubmission = {
        studentName: answers.studentName,
        studentEmail: answers.studentEmail,
        answers: examAnswers
      };

      // Submit to backend using API service
      await examService.submitResponse(shareLink, submission);

      setExamSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="text-red-500 text-lg mb-4">{error || 'Exam not found'}</div>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="text-green-600 text-2xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-accent mb-2">Exam Submitted Successfully!</h2>
            <p className="text-muted mb-4">
              Thank you for taking the exam. Your responses have been recorded.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-bold text-accent text-center">{exam.title}</h1>
            {exam.description && (
              <p className="text-muted text-center">{exam.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted">Questions:</span>
                <span className="font-medium text-accent">{exam.questions.length}</span>
              </div>
              {exam.timeLimit && (
                <div className="flex justify-between">
                  <span className="text-muted">Time Limit:</span>
                  <span className="font-medium text-accent">{exam.timeLimit} minutes</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Total Points:</span>
                <span className="font-medium text-accent">
                  {exam.questions.reduce((sum, q) => sum + (q.points || 0), 0)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(startExam)} className="space-y-4">
              <Input
                label="Your Name"
                placeholder="Enter your full name"
                error={errors.studentName?.message}
                {...register('studentName', { required: 'Name is required' })}
              />
              
              <Input
                label="Your Email"
                type="email"
                placeholder="Enter your email address"
                error={errors.studentEmail?.message}
                {...register('studentEmail', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />

              <Button type="submit" className="w-full" size="lg">
                Start Exam
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Timer Header */}
      {timeLeft !== null && (
        <div className="sticky top-0 bg-white border-b border-border z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-accent">{exam.title}</h1>
              <div className={`text-lg font-mono font-bold ${
                timeLeft < 300 ? 'text-red-600' : 'text-accent'
              }`}>
                Time Left: {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {exam.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-accent">
                    Question {index + 1}
                  </h3>
                  <span className="text-sm text-muted">
                    {question.points} point{question.points !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-accent">{question.question}</p>
                
                {question.type === 'MULTIPLE_CHOICE' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-accent">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'TRUE_FALSE' && (
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="true"
                        onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-accent">True</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="false"
                        onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-accent">False</span>
                    </label>
                  </div>
                )}

                {(question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && (
                  <textarea
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={question.type === 'ESSAY' ? 6 : 3}
                    placeholder="Enter your answer..."
                    value={answers[question.id!] || ''}
                    onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center pt-6">
            <Button
              onClick={submitExam}
              disabled={isSubmitting}
              size="lg"
              className="px-8"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}