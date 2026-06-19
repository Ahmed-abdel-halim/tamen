export function showGlobalLoader(message?: string) {
  window.dispatchEvent(new CustomEvent('show-loader', { detail: { show: true, message } }));
}

export function hideGlobalLoader() {
  window.dispatchEvent(new CustomEvent('show-loader', { detail: { show: false } }));
}

interface LoaderOverlayProps {
  show?: boolean;
  message?: string;
}

export default function LoaderOverlay({ show = true, message = 'جاري تحميل البيانات...' }: LoaderOverlayProps) {
  if (!show) return null;

  return (
    <div className="premium-loader-overlay">
      <style>{`
        .premium-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 100vh;
          background: rgba(9, 15, 30, 0.75);
          backdrop-filter: blur(12px) saturate(190%);
          -webkit-backdrop-filter: blur(12px) saturate(190%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          transition: all 0.3s ease;
          animation: fadeInOverlay 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (min-width: 1025px) {
          .app-shell.is-sidebar-open .premium-loader-overlay {
            right: 280px;
          }
        }

        .premium-loader-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .premium-loader-spinner-wrap {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Outer animated ring */
        .premium-loader-ring-outer {
          position: absolute;
          width: 90px;
          height: 90px;
          border: 4px solid transparent;
          border-top: 4px solid #00d2ff;
          border-left: 4px solid #00d2ff;
          border-radius: 50%;
          animation: spinClockwise 1.4s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          filter: drop-shadow(0 0 8px rgba(0, 210, 255, 0.4));
        }

        /* Inner reverse animated ring */
        .premium-loader-ring-inner {
          position: absolute;
          width: 66px;
          height: 66px;
          border: 4px solid transparent;
          border-bottom: 4px solid #3a7bd5;
          border-right: 4px solid #3a7bd5;
          border-radius: 50%;
          animation: spinCounterClockwise 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          filter: drop-shadow(0 0 6px rgba(58, 123, 213, 0.3));
        }

        .premium-loader-core {
          position: absolute;
          width: 58px;
          height: 58px;
          background: #090f1e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulseCore 1.5s ease-in-out infinite;
          padding: 6px;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }

        .premium-loader-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .premium-loader-text {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          letter-spacing: 0.5px;
          direction: rtl;
          animation: pulseText 1.8s ease-in-out infinite;
        }

        @keyframes spinClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spinCounterClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        @keyframes pulseCore {
          0%, 100% {
            transform: scale(0.9);
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.8);
          }
        }

        @keyframes pulseText {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
            color: #38bdf8;
            text-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
          }
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(12px);
          }
        }
      `}</style>
      <div className="premium-loader-container">
        <div className="premium-loader-spinner-wrap">
          <div className="premium-loader-ring-outer"></div>
          <div className="premium-loader-ring-inner"></div>
          <div className="premium-loader-core">
            <img src="/img/logo3.png" alt="Logo" className="premium-loader-logo" />
          </div>
        </div>
        <div className="premium-loader-text">
          {message}
        </div>
      </div>
    </div>
  );
}
