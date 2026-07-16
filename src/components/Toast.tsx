import React, { useState, useEffect } from 'react';
import '../styles/Toast.css';

export type ToastType = 'success' | 'error';

interface ToastData {
  message: string;
  type: ToastType;
}

// Global variable to hold the showToast function
let showToastFn: (message: string, type: ToastType) => void;

export const showToast = (message: string, type: ToastType = 'success') => {
  if (showToastFn) {
    showToastFn(message, type);
  }
};

export const ToastContainer: React.FC = () => {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    showToastFn = (message: string, type: ToastType) => {
      setToast({ message, type });
      // Auto close - longer for errors with multiple messages
      const lines = message.split('\n').length;
      const duration = type === 'error' ? Math.max(5000, lines * 2000) : 3000;
      setTimeout(() => {
        setToast(null);
      }, duration);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-content">
        <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
        <span style={{ whiteSpace: 'pre-line' }}>{toast.message}</span>
      </div>
      <button className="toast-close" onClick={() => setToast(null)}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};
