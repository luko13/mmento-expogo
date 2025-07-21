// context/TrickDeletionContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface TrickDeletionContextType {
  deletedTrickId: string | null;
  setDeletedTrickId: (trickId: string | null) => void;
  notifyTrickDeleted: (trickId: string) => void;
}

const TrickDeletionContext = createContext<TrickDeletionContextType | undefined>(undefined);

export const TrickDeletionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deletedTrickId, setDeletedTrickId] = useState<string | null>(null);

  const notifyTrickDeleted = useCallback((trickId: string) => {
    setDeletedTrickId(trickId);
    // Reset after a short delay to allow components to react
    setTimeout(() => setDeletedTrickId(null), 100);
  }, []);

  return (
    <TrickDeletionContext.Provider 
      value={{ 
        deletedTrickId, 
        setDeletedTrickId,
        notifyTrickDeleted
      }}
    >
      {children}
    </TrickDeletionContext.Provider>
  );
};

export const useTrickDeletion = () => {
  const context = useContext(TrickDeletionContext);
  if (!context) {
    throw new Error('useTrickDeletion must be used within a TrickDeletionProvider');
  }
  return context;
};