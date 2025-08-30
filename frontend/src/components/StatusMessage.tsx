import React from 'react';

interface StatusMessageProps {
  message: string;
  type: 'loading' | 'error' | 'success';
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message, type }) => {
  return (
    <div className={`status ${type}`}>
      {message}
    </div>
  );
};

export default StatusMessage;