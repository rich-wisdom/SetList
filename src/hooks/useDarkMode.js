import { useEffect } from 'react';

export const useDarkMode = () => {
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleDarkModeChange = (e) => {
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    };

    // Set initial dark mode
    handleDarkModeChange(darkModeQuery);

    // Listen for changes
    darkModeQuery.addListener(handleDarkModeChange);

    return () => darkModeQuery.removeListener(handleDarkModeChange);
  }, []);
}; 