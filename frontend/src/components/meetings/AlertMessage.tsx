import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AlertMessageProps {
  type: 'error' | 'success';
  message: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, message }) => {
  const isError = type === 'error';
  
  return (
    <div
      className={`${
        isError
          ? 'bg-red-50 border-red-200'
          : 'bg-green-50 border-green-200'
      } border rounded-lg p-4 flex items-start gap-3`}
    >
      {isError ? (
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      )}
      <p
        className={`${
          isError ? 'text-red-800' : 'text-green-800'
        } text-sm`}
      >
        {message}
      </p>
    </div>
  );
};

export default AlertMessage;