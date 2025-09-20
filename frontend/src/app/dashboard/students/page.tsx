'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { examService } from '@/lib/api';
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

interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  totalExamsTaken: number;
  averageScore: number;
  lastActivity: string;
}

interface ExamResponse {
  id: string;
  examTitle: string;
  score: number;
  totalPoints: number;
  submittedAt: string;
  studentName: string;
  studentEmail: string;
}

export default function StudentsPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'totalExams' | 'averageScore' | 'lastActivity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentResponses, setStudentResponses] = useState<ExamResponse[]>([]);

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
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get all exam responses to build student data
        const exams = await examService.getExams();
        const allResponses: ExamResponse[] = [];
        
        for (const exam of exams) {
          try {
            const examResponses = await examService.getExamResponses(exam.id, 1, 100);
            const responsesWithExamTitle = examResponses.responses.map((response: any) => ({
              ...response,
              examTitle: exam.title
            }));
            allResponses.push(...responsesWithExamTitle);
          } catch (err) {
            // Skip if exam has no responses
            continue;
          }
        }
        
        setResponses(allResponses);
        
        // Build unique students list from responses
        const studentMap = new Map<string, Student>();
        
        allResponses.forEach(response => {
          const studentKey = response.studentEmail;
          
          if (!studentMap.has(studentKey)) {
            studentMap.set(studentKey, {
              id: response.studentEmail, // Using email as ID since we don't have user IDs
              name: response.studentName || 'Anonymous',
              email: response.studentEmail,
              createdAt: response.submittedAt, // First submission date
              totalExamsTaken: 0,
              averageScore: 0,
              lastActivity: response.submittedAt
            });
          }
          
          const student = studentMap.get(studentKey)!;
          student.totalExamsTaken += 1;
          
          // Update last activity if this response is more recent
          if (new Date(response.submittedAt) > new Date(student.lastActivity)) {
            student.lastActivity = response.submittedAt;
          }
          
          // Update creation date if this response is older
          if (new Date(response.submittedAt) < new Date(student.createdAt)) {
            student.createdAt = response.submittedAt;
          }
        });
        
        // Calculate average scores
        studentMap.forEach((student, email) => {
          const studentResponses = allResponses.filter(r => r.studentEmail === email);
          const totalScore = studentResponses.reduce((sum, r) => sum + (r.score || 0), 0);
          const totalPossible = studentResponses.reduce((sum, r) => sum + r.totalPoints, 0);
          student.averageScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        });
        
        setStudents(Array.from(studentMap.values()));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleViewStudent = (student: Student) => {
    const studentResponses = responses.filter(r => r.studentEmail === student.email);
    setStudentResponses(studentResponses);
    setSelectedStudent(student);
  };

  const filteredAndSortedStudents = students
    .filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'totalExams':
          comparison = a.totalExamsTaken - b.totalExamsTaken;
          break;
        case 'averageScore':
          comparison = a.averageScore - b.averageScore;
          break;
        case 'lastActivity':
          comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <DashboardLayout user={user} title="Students" subtitle="Manage student data">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      title="Students" 
      subtitle={`${filteredAndSortedStudents.length} student${filteredAndSortedStudents.length !== 1 ? 's' : ''} found`}
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
                placeholder="Search students..."
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

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
              <option value="totalExams-desc">Most Exams</option>
              <option value="totalExams-asc">Fewest Exams</option>
              <option value="averageScore-desc">Highest Score</option>
              <option value="averageScore-asc">Lowest Score</option>
              <option value="lastActivity-desc">Most Recent</option>
              <option value="lastActivity-asc">Least Recent</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        {filteredAndSortedStudents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-accent mb-2">
                {searchTerm ? 'No students found' : 'No student data yet'}
              </h3>
              <p className="text-muted">
                {searchTerm 
                  ? 'Try adjusting your search term' 
                  : 'Student data will appear here once they start taking exams'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Student Overview</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-accent">Student</th>
                      <th className="text-left py-3 px-4 font-medium text-accent">Email</th>
                      <th className="text-center py-3 px-4 font-medium text-accent">Exams Taken</th>
                      <th className="text-center py-3 px-4 font-medium text-accent">Avg Score</th>
                      <th className="text-left py-3 px-4 font-medium text-accent">Last Activity</th>
                      <th className="text-center py-3 px-4 font-medium text-accent">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedStudents.map((student) => (
                      <tr key={student.id} className="border-b border-border hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-accent">{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted">{student.email}</td>
                        <td className="py-3 px-4 text-center font-medium">{student.totalExamsTaken}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${getScoreColor(student.averageScore)}`}>
                            {student.averageScore}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted">
                          {formatDate(student.lastActivity)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewStudent(student)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {students.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Summary Statistics</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{students.length}</div>
                  <p className="text-sm text-muted">Total Students</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {Math.round(students.reduce((sum, s) => sum + s.totalExamsTaken, 0) / students.length)}
                  </div>
                  <p className="text-sm text-muted">Avg Exams per Student</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(students.reduce((sum, s) => sum + s.averageScore, 0) / students.length)}%
                  </div>
                  <p className="text-sm text-muted">Overall Avg Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {responses.length}
                  </div>
                  <p className="text-sm text-muted">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-accent">{selectedStudent.name}</h3>
                    <p className="text-muted">{selectedStudent.email}</p>
                    <div className="mt-2 flex space-x-4 text-sm text-muted">
                      <span>Exams Taken: {selectedStudent.totalExamsTaken}</span>
                      <span>Average Score: {selectedStudent.averageScore}%</span>
                      <span>Last Activity: {formatDate(selectedStudent.lastActivity)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudent(null)}
                  >
                    ✕ Close
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-accent">Exam History</h4>
                  {studentResponses.length === 0 ? (
                    <p className="text-muted">No exam submissions found.</p>
                  ) : (
                    <div className="space-y-3">
                      {studentResponses.map((response) => (
                        <div key={response.id} className="border border-border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-accent">{response.examTitle}</h5>
                              <p className="text-sm text-muted">
                                Submitted: {formatDate(response.submittedAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${getScoreColor(Math.round((response.score / response.totalPoints) * 100))}`}>
                                {response.score}/{response.totalPoints} ({Math.round((response.score / response.totalPoints) * 100)}%)
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}