import { useEffect, useState } from 'react';
import { initDatabase } from '../lib/database';

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDb = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        console.log('Initializing database...');
        await initDatabase();
        console.log('Database initialized successfully');
        setIsInitialized(true);
      } catch (err) {
        console.error('Database initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDb();
  }, []);

  return {
    isInitialized,
    isInitializing,
    error,
    retry: () => {
      setIsInitialized(false);
      setIsInitializing(true);
      setError(null);
    }
  };
}
