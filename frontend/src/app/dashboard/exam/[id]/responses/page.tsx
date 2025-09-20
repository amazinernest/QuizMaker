'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authService } from '@/lib/auth';
import { examService, type ExamResponse, type Exam } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'TUTOR' | 'STUDENT';
}

export default function ExamResponsesPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResponse, setSelectedResponse] = useState<ExamResponse | null>(null);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [newScore, setNewScore] = useState<number>(0);

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
    const fetchData = async () => {
      if (!examId || !user) return;
      
      try {
        setIsLoading(true);
        const [examData, responsesData] = await Promise.all([
          examService.getExam(examId),
          examService.getExamResponses(examId, currentPage, 10)
        ]);
        
        setExam(examData);
        setResponses(responsesData.responses);
        setPagination(responsesData.pagination);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load exam responses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [examId, user, currentPage]);

  const handleScoreUpdate = async (responseId: string, score: number) => {
    try {
      setIsUpdatingScore(true);
      await examService.updateResponseScore(responseId, score);
      
      // Refresh responses
      const responsesData = await examService.getExamResponses(examId, currentPage, 10);
      setResponses(responsesData.responses);
      setSelectedResponse(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update score');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getScoreColor = (score: number | null, totalPoints: number) => {
    if (score === null) return 'text-gray-500';
    const percentage = (score / totalPoints) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScorePercentage = (score: number | null, totalPoints: number) => {
    if (score === null) return 'Pending';
    return `${score}/${totalPoints} (${Math.round((score / totalPoints) * 100)}%)`;
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

  return (
    <DashboardLayout 
      user={user} 
      title={`${exam.title} - Responses`} 
      subtitle={`${responses.length} student response${responses.length !== 1 ? 's' : ''}`}
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">{pagination?.total || 0}</div>
              <p className="text-sm text-muted">Total Responses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {responses.filter(r => r.score !== null && r.score >= r.totalPoints * 0.8).length}
              </div>
              <p className="text-sm text-muted">High Scores (≥80%)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {responses.filter(r => r.score !== null && r.score >= r.totalPoints * 0.6 && r.score < r.totalPoints * 0.8).length}
              </div>
              <p className="text-sm text-muted">Medium Scores (60-79%)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {responses.filter(r => r.score !== null && r.score < r.totalPoints * 0.6).length}
              </div>
              <p className="text-sm text-muted">Low Scores (&lt;60%)</p>
            </CardContent>
          </Card>
        </div>

        {/* Responses List */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Student Responses</h3>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted text-lg">No responses yet</p>
                <p className="text-sm text-muted mt-2">
                  Share your exam link with students to start receiving responses
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {responses.map((response) => (
                  <div key={response.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-accent">
                          {response.studentName || 'Anonymous Student'}
                        </h4>
                        <p className="text-sm text-muted">{response.studentEmail}</p>
                        <p className="text-xs text-muted">
                          Submitted: {formatDate(response.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getScoreColor(response.score, response.totalPoints)}`}>
                          {getScorePercentage(response.score, response.totalPoints)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedResponse(response);
                            setNewScore(response.score || 0);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {currentPage} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.pages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Detail Modal */}
        {selectedResponse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-accent">
                      {selectedResponse.studentName || 'Anonymous Student'}
                    </h3>
                    <p className="text-muted">{selectedResponse.studentEmail}</p>
                    <p className="text-sm text-muted">
                      Submitted: {formatDate(selectedResponse.submittedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedResponse(null)}
                  >
                    ✕ Close
                  </Button>
                </div>

                {/* Score Update */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-accent mb-1">
                        Update Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={selectedResponse.totalPoints}
                        value={newScore}
                        onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                    </div>
                    <div className="text-sm text-muted">
                      out of {selectedResponse.totalPoints} points
                    </div>
                    <Button
                      size="sm"
                      disabled={isUpdatingScore}
                      onClick={() => handleScoreUpdate(selectedResponse.id, newScore)}
                    >
                      {isUpdatingScore ? 'Updating...' : 'Update Score'}
                    </Button>
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-accent">Student Answers</h4>
                  {selectedResponse.answers.map((answer, index) => (
                    <div key={answer.id} className="border border-border rounded-lg p-4">
                      <div className="mb-2">
                        <span className="text-sm font-medium text-accent">
                          Question {index + 1} ({answer.question.points} point{answer.question.points !== 1 ? 's' : ''})
                        </span>
                        <span className="ml-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                          {answer.question.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-accent mb-3">{answer.question.question}</p>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium text-accent mb-1">Student Answer:</p>
                        <p className="text-accent">{answer.answer}</p>
                      </div>

                      {answer.question.correctAnswer && (
                        <div className="mt-2 bg-green-50 p-3 rounded">
                          <p className="text-sm font-medium text-green-800 mb-1">Correct Answer:</p>
                          <p className="text-green-700">{answer.question.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="flex space-x-4">
          <Button onClick={() => router.push(`/dashboard/exam/${examId}`)}>
            Back to Exam Details
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}