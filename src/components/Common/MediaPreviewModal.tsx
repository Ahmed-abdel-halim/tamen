import React, { useState, useEffect } from 'react';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  subtitle?: string;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  isOpen,
  onClose,
  url,
  title = 'معاينة المرفق والمستند',
  subtitle
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, url, onClose]);

  if (!isOpen || !url) return null;

  const isPdf = Boolean(
    url.toLowerCase().endsWith('.pdf') ||
    url.toLowerCase().includes('.pdf?') ||
    url.toLowerCase().includes('application/pdf')
  );

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setRotation(0); };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
        fontFamily: 'Cairo, sans-serif'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isPdf ? '1100px' : '950px',
          maxHeight: '94vh',
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: '#1e293b',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                color: isPdf ? '#ef4444' : '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}
            >
              <i className={isPdf ? 'fa-solid fa-file-pdf' : 'fa-solid fa-image'}></i>
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 800 }}>
                {title}
              </h4>
              {subtitle && (
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{subtitle}</span>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="تكبير"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fa-solid fa-magnifying-glass-plus"></i>
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="تصغير"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fa-solid fa-magnifying-glass-minus"></i>
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="تدوير"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="إعادة ضبط الحجم"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    padding: '0 10px',
                    height: '34px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  100%
                </button>
              </>
            )}

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="فتح بنافذة خارجية"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#38bdf8',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none'
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
            </a>

            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              title="تحميل الملف"
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                padding: '0 12px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <i className="fa-solid fa-download"></i>
              <span>تحميل</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              title="إغلاق"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 900
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isPdf ? '0' : '24px',
            background: '#020617',
            minHeight: isPdf ? '75vh' : '450px'
          }}
        >
          {isPdf ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              title="PDF Viewer"
              style={{
                width: '100%',
                height: '80vh',
                border: 'none',
                background: '#ffffff'
              }}
            />
          ) : (
            <div
              style={{
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
              }}
            >
              <img
                src={url}
                alt={title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPreviewModal;
