import { useEffect, useState } from 'react';

export type ColorTheme = 'light' | 'dark';

/**
 * Manages dark/light color theme and WCAG High-Contrast mode,
 * syncing attributes onto the root `<html>` element.
 */
export function useThemePreferences() {
  const [theme, setTheme] = useState<ColorTheme>('dark');
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.dataset.contrast = 'high';
    } else {
      delete document.documentElement.dataset.contrast;
    }
  }, [highContrast]);

  return {
    theme,
    highContrast,
    toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
    toggleHighContrast: () => setHighContrast((prev) => !prev),
  };
}
