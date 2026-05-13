import { useEffect } from 'react';

/**
 * Global scroll-reveal hook.
 * Attaches an IntersectionObserver to every element with [data-reveal].
 * Call once at the app root level – it re-observes whenever the DOM mutates.
 */
export const useScrollReveal = () => {
  useEffect(() => {
    let observer: IntersectionObserver;

    const observe = (el: Element) => {
      if (el.hasAttribute('data-reveal-observed')) return;
      el.setAttribute('data-reveal-observed', '1');
      observer.observe(el);
    };

    const observeAll = () => {
      // Small delay to ensure React has finished rendering the new DOM nodes
      setTimeout(() => {
        document.querySelectorAll('[data-reveal]').forEach(observe);
      }, 100);
    };

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.revealDelay ?? '0';
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add('revealed');
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    // Initial observation
    observeAll();

    // Re-observe when new content is added (route changes, lazy components)
    const mutation = new MutationObserver(observeAll);
    mutation.observe(document.body, { childList: true, subtree: true });

    // Listen for custom route change event from App.tsx
    window.addEventListener('app-route-change', observeAll);

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener('app-route-change', observeAll);
    };
  }, []);
};
