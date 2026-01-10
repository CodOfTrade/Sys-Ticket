import { useState, useEffect, useRef, ReactNode } from 'react';
import { Search, X } from 'lucide-react';

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  metadata?: any;
}

interface AutocompleteProps {
  value: string;
  onChange: (selectedOption: AutocompleteOption | null) => void;
  onSearchChange?: (query: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  isLoading?: boolean;
  minChars?: number;
  disabled?: boolean;
  renderOption?: (option: AutocompleteOption) => ReactNode;
  className?: string;
}

export function Autocomplete({
  value,
  onChange,
  onSearchChange,
  options,
  placeholder = 'Digite para buscar...',
  isLoading = false,
  minChars = 2,
  disabled = false,
  renderOption,
  className = '',
}: AutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < minChars) {
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearchChange?.(searchQuery);
      setShowSuggestions(true);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, minChars, onSearchChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    setSearchQuery(option.label);
    setShowSuggestions(false);
    onChange(option);
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    onChange(null);
  };

  const defaultRenderOption = (option: AutocompleteOption) => (
    <div>
      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
      {option.sublabel && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.sublabel}</div>
      )}
    </div>
  );

  return (
    <div ref={autocompleteRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length >= minChars && options.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
            >
              {renderOption ? renderOption(option) : defaultRenderOption(option)}
            </button>
          ))}
        </div>
      )}

      {showSuggestions && options.length === 0 && !isLoading && searchQuery.length >= minChars && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}
