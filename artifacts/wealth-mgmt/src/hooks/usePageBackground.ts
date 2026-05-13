import { useEffect } from 'react';

export type BackgroundVariant = 'dark' | 'light' | 'semi';

export const usePageBackground = (variant: BackgroundVariant) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-bg', variant);
    // Cleanup is usually not needed here as another page will overwrite it
  }, [variant]);
};
