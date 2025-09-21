'use client';

import { FcGoogle } from 'react-icons/fc';

interface GoogleAuthButtonProps {
  text?: string;
  className?: string;
  disabled?: boolean;
}

export default function GoogleAuthButton({ 
  text = "Continue with Google", 
  className = "",
  disabled = false 
}: GoogleAuthButtonProps) {
  const handleGoogleAuth = () => {
    if (disabled) return;
    
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <button
      onClick={handleGoogleAuth}
      disabled={disabled}
      className={`
        w-full flex items-center justify-center gap-3 px-4 py-3 
        border border-gray-300 rounded-lg text-gray-700 font-medium
        hover:bg-gray-50 hover:border-gray-400 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
        transition-all duration-200
        ${className}
      `}
    >
      <FcGoogle className="w-5 h-5" />
      <span>{text}</span>
    </button>
  );
}