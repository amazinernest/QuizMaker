# Google OAuth Setup Guide for Quiz Craft

## Overview
This guide will help you complete the Google OAuth integration for the Quiz Craft application. The implementation is now complete on both frontend and backend, but requires Google OAuth credentials to function.

## What's Been Implemented

### Backend Changes ✅
- **Dependencies**: Installed `passport`, `passport-google-oauth20`, and `express-session`
- **Database Schema**: Updated User model with Google OAuth fields:
  - `googleId` (optional String)
  - `avatar` (optional String) 
  - `provider` (optional String)
  - `password` (now optional for Google users)
- **Passport Configuration**: Created `/src/config/passport.js` with Google OAuth strategy
- **Session Management**: Added session middleware to server
- **OAuth Routes**: Added `/api/auth/google`, `/api/auth/google/callback`, and `/api/auth/logout`

### Frontend Changes ✅
- **Dependencies**: Installed `react-icons` for Google icon
- **Components**: Created reusable `GoogleAuthButton` component
- **Pages**: Updated login and registration pages with Google OAuth buttons
- **Callback Handler**: Created `/auth/callback` page for OAuth response handling
- **UI Integration**: Seamlessly integrated Google buttons with existing design

## Required Setup Steps

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API or Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - Application name: "Quiz Craft"
   - Authorized domains: `localhost` (for development)
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`

### 2. Environment Variables Setup
Add these variables to your `backend/.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here
```

### 3. Frontend Environment Variables
Add to your `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## How It Works

### Authentication Flow
1. User clicks "Continue with Google" button
2. Redirected to Google OAuth consent screen
3. After approval, Google redirects to backend callback
4. Backend processes OAuth response:
   - Creates new user if doesn't exist
   - Links Google account to existing user if email matches
   - Generates JWT token
5. User redirected to frontend callback page with token
6. Frontend stores token and redirects to dashboard

### User Account Linking
- **New Users**: Automatically created with Google profile data
- **Existing Users**: Google account linked to existing email
- **Profile Data**: Name and avatar imported from Google

## Testing the Implementation

### 1. Start Both Servers
```bash
# Backend (Terminal 1)
cd backend
npm start

# Frontend (Terminal 2) 
cd frontend
npm run dev
```

### 2. Test OAuth Flow
1. Visit `http://localhost:3000/login`
2. Click "Continue with Google" button
3. Should redirect to Google (will show error without credentials)
4. After setup, complete flow should work end-to-end

### 3. Verify Database
Check that users created via Google OAuth have:
- `googleId` populated
- `provider` set to 'google'
- `password` as null
- `avatar` with Google profile picture

## Security Features

### Implemented Security
- **Session Management**: Secure session handling with express-session
- **CSRF Protection**: Built into Passport.js
- **JWT Integration**: Seamless token generation after OAuth
- **Account Linking**: Safe linking of Google accounts to existing users
- **Error Handling**: Comprehensive error handling for OAuth failures

### Production Considerations
- Use HTTPS in production
- Set secure session cookies
- Configure proper CORS origins
- Use environment-specific callback URLs
- Implement rate limiting on OAuth endpoints

## Troubleshooting

### Common Issues
1. **"OAuth Error"**: Check Google Client ID/Secret
2. **"Callback Failed"**: Verify callback URL matches Google Console
3. **"Session Error"**: Ensure SESSION_SECRET is set
4. **"Database Error"**: Run `npx prisma db push` to update schema

### Debug Mode
Enable debug logging by adding to backend `.env`:
```env
DEBUG=passport:*
```

## File Structure
```
backend/
├── src/config/passport.js          # Passport Google OAuth strategy
├── src/routes/auth.js              # OAuth routes (/google, /callback)
├── src/server.js                   # Session middleware setup
├── prisma/schema.prisma            # Updated User model
└── .env.example                    # Environment variables template

frontend/
├── src/components/auth/GoogleAuthButton.tsx  # Reusable OAuth button
├── src/app/auth/callback/page.tsx            # OAuth callback handler
├── src/app/login/page.tsx                    # Updated login page
└── src/app/register/page.tsx                 # Updated registration page
```

## Next Steps
1. Set up Google Cloud Console project
2. Add environment variables
3. Test the complete OAuth flow
4. Deploy with production OAuth settings

The implementation is complete and ready for testing once you configure the Google OAuth credentials!