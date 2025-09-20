'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface ExamResponse {
  id: string;
  examTitle: string;
  examId: string;
  score: number;
  totalPoints: number;
  submittedAt: string;
  studentName: string;
  studentEmail: string;
}

interface AnalyticsData {
  totalExams: number;
  totalResponses: number;
  totalStudents: number;
  averageScore: number;
  examPerformance: Array<{
    examId: string;
    examTitle: string;
    totalResponses: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }>;
  scoreDistribution: {
    excellent: number; // 90-100%
    good: number;      // 80-89%
    average: number;   // 70-79%
    poor: number;      // 60-69%
    failing: number;   // <60%
  };
  recentActivity: ExamResponse[];
  topPerformingExams: Array<{
    examTitle: string;
    averageScore: number;
    responseCount: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

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
    const fetchAnalytics = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get all exams
        const exams = await examService.getExams();
        const allResponses: ExamResponse[] = [];
        const examPerformance: AnalyticsData['examPerformance'] = [];
        
        // Get responses for each exam
        for (const exam of exams) {
          try {
            const examResponses = await examService.getExamResponses(exam.id, 1, 1000);
            const responsesWithExamInfo = examResponses.responses.map((response: any) => ({
              ...response,
              examTitle: exam.title,
              examId: exam.id
            }));
            
            allResponses.push(...responsesWithExamInfo);
            
            // Calculate exam performance
            if (responsesWithExamInfo.length > 0) {
              const scores = responsesWithExamInfo.map((r: any) => (r.score / r.totalPoints) * 100);
              const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
              
              examPerformance.push({
                examId: exam.id,
                examTitle: exam.title,
                totalResponses: responsesWithExamInfo.length,
                averageScore: Math.round(averageScore),
                highestScore: Math.round(Math.max(...scores)),
                lowestScore: Math.round(Math.min(...scores))
              });
            }
          } catch (err) {
            // Skip exams with no responses
            continue;
          }
        }
        
        // Filter by time range
        const now = new Date();
        const timeRangeMs = {
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000,
          '90d': 90 * 24 * 60 * 60 * 1000,
          'all': Infinity
        };
        
        const filteredResponses = timeRange === 'all' 
          ? allResponses 
          : allResponses.filter(response => 
              now.getTime() - new Date(response.submittedAt).getTime() <= timeRangeMs[timeRange]
            );
        
        // Calculate analytics
        const uniqueStudents = new Set(filteredResponses.map(r => r.studentEmail));
        const totalScore = filteredResponses.reduce((sum, r) => sum + (r.score / r.totalPoints) * 100, 0);
        const averageScore = filteredResponses.length > 0 ? totalScore / filteredResponses.length : 0;
        
        // Score distribution
        const scoreDistribution = {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0,
          failing: 0
        };
        
        filteredResponses.forEach(response => {
          const percentage = (response.score / response.totalPoints) * 100;
          if (percentage >= 90) scoreDistribution.excellent++;
          else if (percentage >= 80) scoreDistribution.good++;
          else if (percentage >= 70) scoreDistribution.average++;
          else if (percentage >= 60) scoreDistribution.poor++;
          else scoreDistribution.failing++;
        });
        
        // Recent activity (last 10 responses)
        const recentActivity = [...filteredResponses]
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, 10);
        
        // Top performing exams
        const topPerformingExams = [...examPerformance]
          .sort((a, b) => b.averageScore - a.averageScore)
          .slice(0, 5)
          .map(exam => ({
            examTitle: exam.examTitle,
            averageScore: exam.averageScore,
            responseCount: exam.totalResponses
          }));
        
        setAnalytics({
          totalExams: exams.length,
          totalResponses: filteredResponses.length,
          totalStudents: uniqueStudents.size,
          averageScore: Math.round(averageScore),
          examPerformance,
          scoreDistribution,
          recentActivity,
          topPerformingExams
        });
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, timeRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Average';
    if (score >= 60) return 'Poor';
    return 'Failing';
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Analytics" subtitle="Exam performance insights">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analytics) {
    return (
      <DashboardLayout user={user} title="Analytics" subtitle="Exam performance insights">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-4">{error || 'Failed to load analytics'}</div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      title="Analytics" 
      subtitle="Exam performance insights and statistics"
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Time Range Filter */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-accent">Performance Overview</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">{analytics.totalExams}</div>
              <p className="text-sm text-muted">Total Exams</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-accent mb-2">{analytics.totalResponses}</div>
              <p className="text-sm text-muted">Total Responses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{analytics.totalStudents}</div>
              <p className="text-sm text-muted">Unique Students</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(analytics.averageScore)}`}>
                {analytics.averageScore}%
              </div>
              <p className="text-sm text-muted">Average Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Score Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {analytics.scoreDistribution.excellent}
                </div>
                <p className="text-sm text-muted">Excellent</p>
                <p className="text-xs text-muted">(90-100%)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {analytics.scoreDistribution.good}
                </div>
                <p className="text-sm text-muted">Good</p>
                <p className="text-xs text-muted">(80-89%)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {analytics.scoreDistribution.average}
                </div>
                <p className="text-sm text-muted">Average</p>
                <p className="text-xs text-muted">(70-79%)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {analytics.scoreDistribution.poor}
                </div>
                <p className="text-sm text-muted">Poor</p>
                <p className="text-xs text-muted">(60-69%)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {analytics.scoreDistribution.failing}
                </div>
                <p className="text-sm text-muted">Failing</p>
                <p className="text-xs text-muted">(&lt;60%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Exam Performance */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-accent">Exam Performance</h3>
            </CardHeader>
            <CardContent>
              {analytics.examPerformance.length === 0 ? (
                <p className="text-muted text-center py-8">No exam data available</p>
              ) : (
                <div className="space-y-4">
                  {analytics.examPerformance.slice(0, 5).map((exam) => (
                    <div key={exam.examId} className="border-b border-border pb-3 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-accent line-clamp-1">{exam.examTitle}</h4>
                        <span className={`text-sm font-medium ${getScoreColor(exam.averageScore)}`}>
                          {exam.averageScore}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted">
                        <span>{exam.totalResponses} responses</span>
                        <span>Range: {exam.lowestScore}% - {exam.highestScore}%</span>
                      </div>
                    </div>
                  ))}
                  {analytics.examPerformance.length > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/exams')}
                      className="w-full"
                    >
                      View All Exams
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-accent">Recent Activity</h3>
            </CardHeader>
            <CardContent>
              {analytics.recentActivity.length === 0 ? (
                <p className="text-muted text-center py-8">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {analytics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-accent line-clamp-1">
                          {activity.studentName || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted line-clamp-1">{activity.examTitle}</p>
                        <p className="text-xs text-muted">{formatDate(activity.submittedAt)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${getScoreColor((activity.score / activity.totalPoints) * 100)}`}>
                          {Math.round((activity.score / activity.totalPoints) * 100)}%
                        </span>
                        <p className="text-xs text-muted">
                          {activity.score}/{activity.totalPoints}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Exams */}
        {analytics.topPerformingExams.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-accent">Top Performing Exams</h3>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.topPerformingExams.map((exam, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      <span className={`text-lg font-bold ${getScoreColor(exam.averageScore)}`}>
                        {exam.averageScore}%
                      </span>
                    </div>
                    <h4 className="font-medium text-accent mb-1 line-clamp-2">{exam.examTitle}</h4>
                    <p className="text-sm text-muted">{exam.responseCount} responses</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => router.push('/dashboard/exams')}>
            View All Exams
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/students')}>
            View Students
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/create-exam')}>
            Create New Exam
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}