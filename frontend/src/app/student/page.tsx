'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'TUTOR' | 'STUDENT';
}

export default function StudentPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authService.isAuthenticated()) {
          router.push('/login');
          return;
        }

        const profile = await authService.getProfile();
        if (profile.role !== 'STUDENT') {
          router.push('/dashboard');
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    authService.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-accent">Student Dashboard</h1>
              <p className="text-muted">Welcome back, {user?.name}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Available Exams</h3>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">0</div>
              <p className="text-sm text-muted">Ready to take</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Completed</h3>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">0</div>
              <p className="text-sm text-muted">Exams finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-accent">Average Score</h3>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">--</div>
              <p className="text-sm text-muted">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Exams */}
        <Card className="mb-8">
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Available Exams</h3>
            <p className="text-muted">Exams you can take right now</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-lg font-medium text-accent mb-2">No exams available</h4>
              <p className="text-muted">Check back later for new exams from your instructors!</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-accent">Recent Results</h3>
            <p className="text-muted">Your latest exam scores and feedback</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h4 className="text-lg font-medium text-accent mb-2">No results yet</h4>
              <p className="text-muted">Complete your first exam to see your results here!</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}