'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { examService, type Exam } from '@/lib/api';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'TUTOR' | 'STUDENT';
}

export default function ExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

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

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      
      try {
        setIsLoading(true);
        const examData = await examService.getExam(examId);
        setExam(examData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load exam details');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchExam();
    }
  }, [examId, user]);

  const copyShareLink = async () => {
    if (!exam?.shareLink) return;
    
    const shareUrl = `${window.location.origin}/exam/${exam.shareLink}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const toggleExamStatus = async () => {
    if (!exam) return;
    
    try {
      const updatedExam = await examService.updateExam(exam.id!, {
        isActive: !exam.isActive
      });
      setExam(updatedExam);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update exam status');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Loading..." subtitle="">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !exam) {
    return (
      <DashboardLayout user={user} title="Error" subtitle="">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">{error || 'Exam not found'}</div>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${exam.shareLink}`;

  return (
    <DashboardLayout 
      user={user} 
      title={exam.title} 
      subtitle="Exam Details and Sharing"
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Exam Status */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-accent">Exam Status</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  exam.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {exam.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button
                  variant={exam.isActive ? 'destructive' : 'default'}
                  size="sm"
                  onClick={toggleExamStatus}
                >
                  {exam.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted">Questions</p>
                <p className="text-2xl font-bold text-accent">{exam.questions?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Time Limit</p>
                <p className="text-2xl font-bold text-accent">{exam.timeLimit || 'No limit'} min</p>
              </div>
              <div>
                <p className="text-sm text-muted">Total Points</p>
                <p className="text-2xl font-bold text-accent">
                  {exam.questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Link */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Share Exam</h3>
            <p className="text-muted">Share this link with students to take the exam</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 border border-border rounded-md">
                <code className="text-sm text-accent break-all">{shareUrl}</code>
              </div>
              <Button onClick={copyShareLink} variant="outline">
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted mt-2">
              Students can access this exam directly without needing to log in
            </p>
          </CardContent>
        </Card>

        {/* Exam Details */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Exam Information</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-accent mb-2">Description</h4>
              <p className="text-muted">{exam.description || 'No description provided'}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-accent mb-2">Questions ({exam.questions?.length || 0})</h4>
              <div className="space-y-2">
                {exam.questions?.map((question, index) => (
                  <div key={question.id || index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-accent">Question {index + 1}</span>
                      <span className="text-sm text-muted">{question.points} point{question.points !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-accent mb-2">{question.question}</p>
                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      {question.type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/exam/${examId}/edit`)}
          >
            Edit Exam
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/exam/${examId}/responses`)}
          >
            View Responses
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}