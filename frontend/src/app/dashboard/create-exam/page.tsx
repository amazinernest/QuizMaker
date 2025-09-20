'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/auth';
import { examService, type CreateExamData, type Question } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'TUTOR' | 'STUDENT';
}

const questionSchema = z.object({
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  question: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z.number().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100'),
});

const examSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  timeLimit: z.number().min(1, 'Time limit must be at least 1 minute').max(480, 'Time limit cannot exceed 480 minutes').optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

type ExamFormData = z.infer<typeof examSchema>;

export default function CreateExamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getProfile();
        if (userData.role !== 'TUTOR') {
          router.push('/student');
          return;
        }
        setUser(userData);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      description: '',
      timeLimit: 60,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 1,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const watchedQuestions = watch('questions');

  const addQuestion = () => {
    append({
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
    });
  };

  const addOption = (questionIndex: number) => {
    const currentOptions = watchedQuestions[questionIndex]?.options || [];
    const updatedOptions = [...currentOptions, ''];
    // Update the form with new options
    const currentQuestions = [...watchedQuestions];
    currentQuestions[questionIndex] = {
      ...currentQuestions[questionIndex],
      options: updatedOptions,
    };
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = watchedQuestions[questionIndex]?.options || [];
    const updatedOptions = currentOptions.filter((_, index) => index !== optionIndex);
    // Update the form with filtered options
    const currentQuestions = [...watchedQuestions];
    currentQuestions[questionIndex] = {
      ...currentQuestions[questionIndex],
      options: updatedOptions,
    };
  };

  const onSubmit = async (data: ExamFormData) => {
    setIsLoading(true);
    setError('');

    try {
      // Process questions to match API format
      const processedQuestions: Question[] = data.questions.map((q, index) => ({
        type: q.type,
        question: q.question,
        options: q.type === 'MULTIPLE_CHOICE' ? q.options?.filter(opt => opt.trim() !== '') : undefined,
        correctAnswer: q.correctAnswer || undefined,
        points: q.points,
        order: index + 1,
      }));

      const examData: CreateExamData = {
        title: data.title,
        description: data.description || undefined,
        timeLimit: data.timeLimit || undefined,
        questions: processedQuestions,
      };

      const exam = await examService.createExam(examData);
      router.push(`/dashboard/exam/${exam.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create exam. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout 
      user={user} 
      title="Create New Exam" 
      subtitle="Design your exam with questions and answer keys"
    >
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Exam Details */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-accent">Exam Details</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Exam Title"
                placeholder="Enter exam title"
                error={errors.title?.message}
                {...register('title')}
              />

              <div>
                <label className="block text-sm font-medium text-accent mb-2">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Enter exam description"
                  {...register('description')}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <Input
                label="Time Limit (minutes)"
                type="number"
                placeholder="60"
                error={errors.timeLimit?.message}
                {...register('timeLimit', { valueAsNumber: true })}
              />
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-accent">Questions</h3>
                <Button type="button" onClick={addQuestion} variant="outline">
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, questionIndex) => (
                <div key={field.id} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-accent">Question {questionIndex + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => remove(questionIndex)}
                        className="text-destructive hover:bg-destructive hover:text-white"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-2">
                        Question Type
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        {...register(`questions.${questionIndex}.type`)}
                      >
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                    </div>

                    <Input
                      label="Points"
                      type="number"
                      min="1"
                      max="100"
                      error={errors.questions?.[questionIndex]?.points?.message}
                      {...register(`questions.${questionIndex}.points`, { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-accent mb-2">
                      Question Text
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Enter your question"
                      {...register(`questions.${questionIndex}.question`)}
                    />
                    {errors.questions?.[questionIndex]?.question && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.questions[questionIndex]?.question?.message}
                      </p>
                    )}
                  </div>

                  {/* Multiple Choice Options */}
                  {watchedQuestions[questionIndex]?.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-accent">
                          Answer Options
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(questionIndex)}
                        >
                          Add Option
                        </Button>
                      </div>
                      
                      {watchedQuestions[questionIndex]?.options?.map((_, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${optionIndex + 1}`}
                            {...register(`questions.${questionIndex}.options.${optionIndex}`)}
                          />
                          {(watchedQuestions[questionIndex]?.options?.length || 0) > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="text-destructive hover:bg-destructive hover:text-white"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}

                      <div>
                        <label className="block text-sm font-medium text-accent mb-2">
                          Correct Answer
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          {...register(`questions.${questionIndex}.correctAnswer`)}
                        >
                          <option value="">Select correct answer</option>
                          {watchedQuestions[questionIndex]?.options?.map((option, optionIndex) => (
                            <option key={optionIndex} value={option}>
                              {option || `Option ${optionIndex + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* True/False Options */}
                  {watchedQuestions[questionIndex]?.type === 'TRUE_FALSE' && (
                    <div>
                      <label className="block text-sm font-medium text-accent mb-2">
                        Correct Answer
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        {...register(`questions.${questionIndex}.correctAnswer`)}
                      >
                        <option value="">Select correct answer</option>
                        <option value="True">True</option>
                        <option value="False">False</option>
                      </select>
                    </div>
                  )}

                  {/* Short Answer/Essay Answer Key */}
                  {(watchedQuestions[questionIndex]?.type === 'SHORT_ANSWER' || 
                    watchedQuestions[questionIndex]?.type === 'ESSAY') && (
                    <div>
                      <label className="block text-sm font-medium text-accent mb-2">
                        Sample Answer / Answer Key (Optional)
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={3}
                        placeholder="Enter sample answer or grading criteria"
                        {...register(`questions.${questionIndex}.correctAnswer`)}
                      />
                      <p className="mt-1 text-xs text-muted">
                        This will help you grade manually. Students won't see this.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {errors.questions && (
                <p className="text-sm text-destructive">{errors.questions.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Exam...' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}