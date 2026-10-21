'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Define a type for the stored item, which includes the data and a timestamp.
type StoredItem<T> = {
  value: T;
  timestamp: number;
};

const TWO_MINUTES_IN_MS = 2 * 60 * 1000;

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const itemString = window.localStorage.getItem(key);
      if (!itemString) {
        return initialValue;
      }

      const item = JSON.parse(itemString);
      
      // Robustness check: Handle legacy data that isn't wrapped in StoredItem
      if (item && typeof item === 'object' && 'value' in item && 'timestamp' in item) {
          const now = new Date().getTime();
          // Check if the item has expired
          if (now - item.timestamp > TWO_MINUTES_IN_MS) {
            window.localStorage.removeItem(key); // Clean up expired item
            return initialValue;
          }
          return item.value;
      }
      
      // If it's old data format, return initial and clear it
      return initialValue;
    } catch (error) {
      console.warn(`useLocalStorage parse error for key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (storedValue === undefined || storedValue === null) {
            window.localStorage.removeItem(key);
        } else {
            const now = new Date().getTime();
            const itemToStore: StoredItem<T> = {
              value: storedValue,
              timestamp: now,
            };
            const valueToStore = JSON.stringify(itemToStore);
            window.localStorage.setItem(key, valueToStore);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
