# TutorExam - Online Examination Platform

A full-stack SaaS web application for online tutors to create and manage examinations.

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **Deployment**: Vercel (Frontend) + Render (Backend)

## Features

### For Tutors
- 🔐 Secure authentication (signup/login)
- 📝 Create and manage exams
- ❓ Add multiple question types (multiple-choice, true/false, short answer, essay)
- 🔗 Generate unique sharable exam links
- 📊 View student responses and scores
- 📱 Responsive dashboard

### For Students
- 🎯 Access exams via unique links (no login required)
- ⏱️ Timed exam sessions
- ✅ Auto-grading for objective questions
- 📈 Instant score feedback

## Project Structure

```
tutorexam/
├── frontend/          # Next.js application
├── backend/           # Express.js API server
├── package.json       # Root package.json for scripts
└── README.md          # This file
```

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Configure your PostgreSQL database URL and JWT secret

3. **Run database migrations**:
   ```bash
   cd backend && npx prisma migrate dev
   ```

4. **Start development servers**:
   ```bash
   npm run dev
   ```

This will start both frontend (http://localhost:3000) and backend (http://localhost:5000) servers.

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://username:password@localhost:5432/tutorexam"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables including production DATABASE_URL
4. Deploy automatically on push to main branch

## License

MIT License - see LICENSE file for details.