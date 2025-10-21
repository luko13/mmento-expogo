// contexts/SearchContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useDebounce } from "../hooks/useDebounce";

export interface SearchFilters {
  categories: string[];
  tags: string[];
  tagsMode?: "and" | "or";
  difficulties: number[];
  resetTimes: { min?: number; max?: number };
  durations: { min?: number; max?: number };
  angles: string[];
  isPublic?: boolean | null;
  sortOrder?: "recent" | "last";
}

interface SearchContextType {
  searchQuery: string;
  debouncedSearchQuery: string; // Query con debounce para la búsqueda real
  setSearchQuery: (query: string) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const defaultFilters: SearchFilters = {
  categories: [],
  tags: [],
  difficulties: [],
  resetTimes: {},
  durations: {},
  angles: [],
  isPublic: null,
  sortOrder: "recent",
};

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] =
    useState<SearchFilters>(defaultFilters);

  // Debounce del query: espera 300ms después de que el usuario deja de escribir
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchFilters(defaultFilters);
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        debouncedSearchQuery,
        setSearchQuery,
        searchFilters,
        setSearchFilters,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
