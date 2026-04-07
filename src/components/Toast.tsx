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
      // Auto close after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-content">
        <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
        <span>{toast.message}</span>
      </div>
      <button className="toast-close" onClick={() => setToast(null)}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};
