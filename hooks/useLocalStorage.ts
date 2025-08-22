import { useState, useEffect } from 'react';

function getValue<T>(key: string, initialValue: T | (() => T)): T {
  const savedValue = localStorage.getItem(key);
  
  if (savedValue !== null && savedValue !== 'undefined') {
    try {
      // The previous logic incorrectly discarded empty arrays.
      // This simplified logic correctly parses and returns any valid stored JSON.
      return JSON.parse(savedValue);
    } catch (error) {
       console.error(`Error parsing JSON from localStorage key "${key}":`, savedValue, error);
       // Fall through to return the initial value if parsing fails.
    }
  }
  
  return initialValue instanceof Function ? initialValue() : initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => getValue(key, initialValue));

  useEffect(() => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
