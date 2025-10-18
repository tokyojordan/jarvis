import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

// Simple in-memory auth
let currentUserId: string | null = null;

export const useAuth = () => {
  const [userId, setUserId] = useState<string | null>(currentUserId);

  useEffect(() => {
    // Check if user is set
    if (!currentUserId) {
      // For now, prompt for user ID
      const storedUserId = prompt('Enter your user ID (or email):');
      if (storedUserId) {
        currentUserId = storedUserId;
        setUserId(storedUserId);
      }
    }
  }, []);

  const setUser = (id: string) => {
    currentUserId = id;
    setUserId(id);
  };

  const clearUser = () => {
    currentUserId = null;
    setUserId(null);
  };

  return {
    userId,
    setUser,
    clearUser,
    isAuthenticated: !!userId
  };
};