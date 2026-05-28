import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store';

interface UseRequireAuthReturn {
  checkAuth: (feature?: string) => boolean;
  checkPersonalColor: (feature?: string) => boolean;
  showAuthModal: boolean;
  showPersonalColorModal: boolean;
  authModalFeature: string;
  personalColorModalFeature: string;
  closeAuthModal: () => void;
  closePersonalColorModal: () => void;
}

export const useRequireAuth = (): UseRequireAuthReturn => {
  const { isAuthenticated } = useAuthStore();
  const { analysisResult } = useAppStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPersonalColorModal, setShowPersonalColorModal] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState('this feature');
  const [personalColorModalFeature, setPersonalColorModalFeature] = useState('this feature');

  const checkAuth = useCallback(
    (feature: string = 'this feature'): boolean => {
      if (!isAuthenticated) {
        setAuthModalFeature(feature);
        setShowAuthModal(true);
        return false;
      }
      return true;
    },
    [isAuthenticated],
  );

  const checkPersonalColor = useCallback(
    (feature: string = 'this feature'): boolean => {
      // First check if user is authenticated
      if (!isAuthenticated) {
        setAuthModalFeature(feature);
        setShowAuthModal(true);
        return false;
      }

      // Then check if they have personal color diagnosis
      if (!analysisResult) {
        setPersonalColorModalFeature(feature);
        setShowPersonalColorModal(true);
        return false;
      }

      return true;
    },
    [isAuthenticated, analysisResult],
  );

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const closePersonalColorModal = useCallback(() => {
    setShowPersonalColorModal(false);
  }, []);

  return {
    checkAuth,
    checkPersonalColor,
    showAuthModal,
    showPersonalColorModal,
    authModalFeature,
    personalColorModalFeature,
    closeAuthModal,
    closePersonalColorModal,
  };
};
