'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { examService, type Exam } from '@/lib/api';
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

export default function ExamsPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
    const fetchExams = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const examsData = await examService.getExams();
        setExams(examsData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load exams');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [user]);

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    try {
      await examService.deleteExam(examId);
      setExams(exams.filter(exam => exam.id !== examId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  const handleToggleStatus = async (examId: string, currentStatus: boolean) => {
    try {
      await examService.updateExamStatus(examId, !currentStatus);
      setExams(exams.map(exam => 
        exam.id === examId ? { ...exam, isActive: !currentStatus } : exam
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update exam status');
    }
  };

  const filteredAndSortedExams = exams
    .filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && exam.isActive) ||
                           (statusFilter === 'inactive' && !exam.isActive);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="My Exams" subtitle="Manage your exams">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      title="My Exams" 
      subtitle={`${filteredAndSortedExams.length} exam${filteredAndSortedExams.length !== 1 ? 's' : ''} found`}
    >
      <div className="container mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <svg 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="status-desc">Active First</option>
                <option value="status-asc">Inactive First</option>
              </select>
            </div>
          </div>

          <Button onClick={() => router.push('/dashboard/create-exam')}>
            Create New Exam
          </Button>
        </div>

        {/* Exams Grid */}
        {filteredAndSortedExams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-accent mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No exams found' : 'No exams yet'}
              </h3>
              <p className="text-muted mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first exam to get started'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => router.push('/dashboard/create-exam')}>
                  Create Your First Exam
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedExams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-accent mb-1 line-clamp-2">
                        {exam.title}
                      </h3>
                      <p className="text-sm text-muted line-clamp-2">
                        {exam.description || 'No description'}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                      exam.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Exam Stats */}
                    <div className="flex justify-between text-sm text-muted">
                      <span>{exam.questions?.length || 0} questions</span>
                      <span>{exam.timeLimit ? `${exam.timeLimit} min` : 'No time limit'}</span>
                    </div>
                    
                    <div className="text-xs text-muted">
                      Created: {formatDate(exam.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/exam/${exam.id}`)}
                      >
                        View Details
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/exam/${exam.id}/responses`)}
                      >
                        Responses
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(exam.id, exam.isActive)}
                      >
                        {exam.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteExam(exam.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {exams.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Quick Stats</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{exams.length}</div>
                  <p className="text-sm text-muted">Total Exams</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {exams.filter(e => e.isActive).length}
                  </div>
                  <p className="text-sm text-muted">Active Exams</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {exams.filter(e => !e.isActive).length}
                  </div>
                  <p className="text-sm text-muted">Inactive Exams</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {exams.reduce((sum, exam) => sum + (exam.questions?.length || 0), 0)}
                  </div>
                  <p className="text-sm text-muted">Total Questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}