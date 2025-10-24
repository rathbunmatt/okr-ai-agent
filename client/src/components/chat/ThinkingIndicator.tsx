import React from 'react';

interface ThinkingIndicatorProps {
  className?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      {/* Main thinking bar */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-thinking-pulse"></div>
      </div>

      {/* Thinking text with animated dots */}
      <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
        <div className="flex items-center">
          <svg
            className="w-4 h-4 mr-2 animate-spin text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          AI is thinking
        </div>
        <div className="flex gap-1">
          <span className="animate-bounce-dot-1 text-blue-500">•</span>
          <span className="animate-bounce-dot-2 text-blue-500">•</span>
          <span className="animate-bounce-dot-3 text-blue-500">•</span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-xs text-gray-500 mt-1 text-center">
        Analyzing your message and preparing a response
      </p>
    </div>
  );
};