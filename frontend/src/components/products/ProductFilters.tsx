import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ProductCategory, PersonalColorType } from '@/types';
import { CATEGORY_LABELS, PERSONAL_COLOR_LABELS } from '@/types';

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategories: ProductCategory[];
  onCategoryToggle: (category: ProductCategory) => void;
  selectedColors: PersonalColorType[];
  onColorToggle: (color: PersonalColorType) => void;
  onClearFilters: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategories,
  onCategoryToggle,
  selectedColors,
  onColorToggle,
  onClearFilters,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categories: ProductCategory[] = ['hijab', 'blush', 'lip', 'lens'];
  const personalColors: PersonalColor[] = [
    'spring_warm',
    'autumn_warm',
    'summer_cool',
    'winter_cool',
  ];

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedColors.length > 0 || searchTerm.length > 0;

  const FilterContent = () => (
    <>
      {/* Categories */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryToggle(category)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategories.includes(category)
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Colors */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Color</h3>
        <div className="space-y-2">
          {personalColors.map((color) => (
            <button
              key={color}
              onClick={() => onColorToggle(color)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedColors.includes(color)
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {PERSONAL_COLOR_LABELS[color]}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          icon={<X className="w-4 h-4" />}
          fullWidth
        >
          Clear Filters
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          icon={<Filter className="w-4 h-4" />}
          fullWidth
        >
          Filter {hasActiveFilters && `(${selectedCategories.length + selectedColors.length})`}
        </Button>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Mobile Filters Overlay */}
      {showMobileFilters && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterContent />
          </div>
        </div>
      )}
    </>
  );
};
