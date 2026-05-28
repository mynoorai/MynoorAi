import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProductFilters } from '@/types/admin';

interface AdminState {
  filters: ProductFilters;
  uploadingImages: boolean;
  uploadProgress: number;

  setFilters: (filters: ProductFilters) => void;
  setUploadingImages: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  clearProductState: () => void;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    persist(
      (set) => ({
        filters: {},
        uploadingImages: false,
        uploadProgress: 0,

        setFilters: (filters) => set({ filters }),
        setUploadingImages: (uploading) => set({ uploadingImages: uploading }),
        setUploadProgress: (progress) => set({ uploadProgress: progress }),

        clearProductState: () =>
          set({
            filters: {},
            uploadingImages: false,
            uploadProgress: 0,
          }),
      }),
      {
        name: 'pca-hijab-admin',
        partialize: (state) => ({
          filters: state.filters,
        }),
      },
    ),
  ),
);
