import React, { useEffect, useState, memo, useMemo } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastProps } from './Toast.types';

const ToastComponent: React.FC<ToastProps> = ({
  type,
  title,
  message,
  duration = 5000,
  action,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  // Memoize style calculations
  const { icon, backgroundClass, titleClass, messageClass, actionClass, closeClass } =
    useMemo(() => {
      const styles = {
        success: {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          backgroundClass: 'bg-green-50 border-green-200',
          titleClass: 'text-green-900',
          messageClass: 'text-green-700',
          actionClass: 'text-green-600 hover:text-green-500',
          closeClass: 'text-green-400 hover:text-green-500 focus:ring-green-500',
        },
        error: {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          backgroundClass: 'bg-red-50 border-red-200',
          titleClass: 'text-red-900',
          messageClass: 'text-red-700',
          actionClass: 'text-red-600 hover:text-red-500',
          closeClass: 'text-red-400 hover:text-red-500 focus:ring-red-500',
        },
        warning: {
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          backgroundClass: 'bg-yellow-50 border-yellow-200',
          titleClass: 'text-yellow-900',
          messageClass: 'text-yellow-700',
          actionClass: 'text-yellow-600 hover:text-yellow-500',
          closeClass: 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500',
        },
        info: {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          backgroundClass: 'bg-blue-50 border-blue-200',
          titleClass: 'text-blue-900',
          messageClass: 'text-blue-700',
          actionClass: 'text-blue-600 hover:text-blue-500',
          closeClass: 'text-blue-400 hover:text-blue-500 focus:ring-blue-500',
        },
      };

      return (
        styles[type] || {
          icon: null,
          backgroundClass: 'bg-white border-gray-200',
          titleClass: 'text-gray-900',
          messageClass: 'text-gray-700',
          actionClass: 'text-gray-600 hover:text-gray-500',
          closeClass: 'text-gray-400 hover:text-gray-500 focus:ring-gray-500',
        }
      );
    }, [type]);

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto
        border ${backgroundClass}
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${titleClass}`}>{title}</p>
            {message && <p className={`mt-1 text-sm ${messageClass}`}>{message}</p>}
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className={`text-sm font-medium ${actionClass} hover:underline focus:outline-none focus:underline`}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${closeClass}`}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize Toast component
const Toast = memo(ToastComponent);

export default Toast;
