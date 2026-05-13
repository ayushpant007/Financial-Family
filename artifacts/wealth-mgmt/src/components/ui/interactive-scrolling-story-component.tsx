import React, { useState, useEffect, useRef } from 'react';

export interface StorySlide {
  title: string;
  description: string;
  image: string;
  bgColor?: string;
  textColor?: string;
}

interface ScrollingFeatureShowcaseProps {
  slides: StorySlide[];
  /** Height of the scrollable showcase section (default: "500px") */
  height?: string;
  /** CTA button text (default: "Get Started") */
  ctaText?: string;
  /** CTA button href (default: "#") */
  ctaHref?: string;
  /** Optional click handler for CTA */
  onClick?: () => void;
}

export function ScrollingFeatureShowcase({
  slides,
  height = '500px',
  ctaText,
  ctaHref = '#',
  onClick,
}: ScrollingFeatureShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      if (scrollableHeight <= 0) return;
      const stepHeight = scrollableHeight / slides.length;
      const newActiveIndex = Math.min(
        slides.length - 1,
        Math.floor(container.scrollTop / stepHeight)
      );
      setActiveIndex(newActiveIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [slides.length]);

  const currentSlide = slides[activeIndex] ?? slides[0];

  const dynamicStyles: React.CSSProperties = {
    backgroundColor: currentSlide.bgColor ?? '#fff100',
    color: currentSlide.textColor ?? '#000000',
    transition: 'background-color 0.7s ease, color 0.7s ease',
  };

  const gridPatternStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
    `,
    backgroundSize: '3.5rem 3.5rem',
  };

  const scrollToSlide = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollableHeight = container.scrollHeight - container.clientHeight;
    const stepHeight = scrollableHeight / slides.length;
    container.scrollTo({ top: stepHeight * index, behavior: 'smooth' });
  };

  return (
    <div
      ref={scrollContainerRef}
      className="w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white/60 backdrop-blur-md shadow-xl"
      style={{ height, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      <div style={{ height: `${slides.length * 100}%` }}>
        <div
          ref={stickyPanelRef}
          className="sticky top-0 w-full flex flex-col items-center justify-center bg-transparent"
          style={{ height }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full max-w-7xl mx-auto">

            {/* ── Text & Controls Column ── */}
            <div className="relative flex flex-col p-6 md:p-12 border-r border-slate-100 overflow-hidden">
              {/* Pagination bars (Relative on mobile, Absolute on desktop) */}
              <div className="relative md:absolute top-0 md:top-8 left-0 md:left-8 flex space-x-2 z-20 bg-white/40 backdrop-blur-sm p-1.5 rounded-full shadow-sm w-fit mb-6 md:mb-0">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToSlide(index)}
                    className={`h-1 rounded-full transition-all duration-500 ease-in-out ${
                      index === activeIndex ? 'w-8 bg-primary' : 'w-4 bg-slate-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Slide text */}
              <div className="relative flex-1 flex items-center md:pt-0 min-h-[120px]">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-x-0 top-0 bottom-0 flex flex-col justify-center transition-all duration-700 ease-in-out ${
                      index === activeIndex
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-10 pointer-events-none'
                    }`}
                  >
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                      {slide.title}
                    </h2>
                    <p className="mt-3 text-xs md:text-base text-slate-500 max-w-md leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA (Relative on mobile, Absolute on desktop) */}
              {ctaText && (
                <div className="relative md:absolute bottom-0 md:bottom-6 left-0 md:left-6 mt-8 md:mt-0">
                  <a
                    href={ctaHref}
                    onClick={(e) => {
                      if (onClick) {
                        e.preventDefault();
                        onClick();
                      }
                    }}
                    className="px-6 py-2.5 bg-black text-white font-semibold rounded-full uppercase tracking-wider text-[10px] md:text-xs hover:bg-gray-800 transition-colors shadow-lg cursor-pointer"
                  >
                    {ctaText}
                  </a>
                </div>
              )}
            </div>

            {/* ── Image Column (Shows at top on mobile) ── */}
            <div
              className="flex items-center justify-center p-4 md:p-6 bg-slate-50/10 h-[180px] md:h-full order-first md:order-last"
            >
              <div className="relative w-full h-full md:w-[60%] md:h-[90%] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      index === activeIndex
                        ? 'opacity-100 scale-100 rotate-0'
                        : 'opacity-0 scale-95 rotate-1 pointer-events-none'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://placehold.co/800x1200/e2e8f0/4a5568?text=Image`;
                      }}
                    />
                    {/* Subtle overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
