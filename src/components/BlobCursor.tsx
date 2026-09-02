import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface BlobCursorProps {
  size?: number;
  lightColor?: string;
  darkColor?: string;
  fastness?: number;
}

export default function BlobCursor({
  size = 32,
  lightColor = '#1d1d1b', // Ink Black on light Parchment canvas
  darkColor = '#e2dedb',  // Parchment Cream on dark Ink Black canvas
  fastness = 0.15
}: BlobCursorProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [fillColor, setFillColor] = useState(lightColor);
  const [labelText, setLabelText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isCursorVisible, setIsCursorVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelRef = useRef<HTMLSpanElement>(null);

  // 1. Desktop fine-pointer device detection gate
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(media.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, []);

  // 2. Add body class on successful client mount
  useEffect(() => {
    if (!isDesktop) return;

    document.body.classList.add('blob-cursor-active');
    return () => {
      document.body.classList.remove('blob-cursor-active');
    };
  }, [isDesktop]);

  // 3. Mouse Movement, Viewport Exit/Enter & Section Color Adaptation
  useEffect(() => {
    if (!isDesktop || !containerRef.current) return;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Resume visibility if cursor is moving inside document
      setIsCursorVisible(true);

      // Detect background section color at cursor coordinates
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      if (elem) {
        const darkSection = elem.closest('#contact, .bg-\\[\\#1d1d1b\\], .bg-black, [data-dark-bg="true"]');
        if (darkSection) {
          setFillColor(darkColor);
        } else {
          setFillColor(lightColor);
        }
      }
    };

    // Exit viewport detection (handles top tab bar, sides, and bottom)
    const handleMouseLeave = (e: MouseEvent) => {
      const fromTop = e.clientY <= 0;
      const fromLeft = e.clientX <= 0;
      const fromRight = e.clientX >= window.innerWidth;
      const fromBottom = e.clientY >= window.innerHeight;

      if (!e.relatedTarget || fromTop || fromLeft || fromRight || fromBottom) {
        setIsCursorVisible(false);
      }
    };

    const handleMouseEnter = () => {
      setIsCursorVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseout', (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as any).toElement) {
        setIsCursorVisible(false);
      }
    });

    // GSAP Ticker animation loop for smooth blob trailing
    const xSetters = blobsRef.current.map(blob => blob && gsap.quickSetter(blob, 'x', 'px'));
    const ySetters = blobsRef.current.map(blob => blob && gsap.quickSetter(blob, 'y', 'px'));

    const ticker = () => {
      pos.x += (mouse.x - pos.x) * fastness;
      pos.y += (mouse.y - pos.y) * fastness;

      xSetters.forEach((setter, i) => {
        if (setter) {
          const delayFactor = (i + 1) * 0.08;
          const blobX = pos.x + (mouse.x - pos.x) * delayFactor;
          setter(blobX);
        }
      });

      ySetters.forEach((setter, i) => {
        if (setter) {
          const delayFactor = (i + 1) * 0.08;
          const blobY = pos.y + (mouse.y - pos.y) * delayFactor;
          setter(blobY);
        }
      });
    };

    gsap.ticker.add(ticker);

    // Hover detection for interactive links & buttons
    const interactiveSelector = 'a, button, [data-cursor], input, textarea, .group';
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(interactiveSelector) as HTMLElement;
      if (target) {
        setIsHovered(true);
        let label = target.getAttribute('data-cursor');
        if (!label) {
          if (target.tagName.toLowerCase() === 'a') {
            const href = target.getAttribute('href') || '';
            if (href.startsWith('http')) label = 'VIEW ↗';
            else if (href.startsWith('#')) label = 'GO →';
            else label = 'READ →';
          } else if (target.tagName.toLowerCase() === 'button') {
            label = 'OPEN';
          } else {
            label = 'VIEW';
          }
        }
        setLabelText(label);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(interactiveSelector);
      if (target) {
        setIsHovered(false);
        setLabelText('');
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      gsap.ticker.remove(ticker);
    };
  }, [isDesktop, fastness, lightColor, darkColor]);

  if (!isDesktop) return null;

  const currentSize = isHovered ? size * 1.8 : size;

  return (
    <>
      {/* SVG Gooey Filter */}
      <svg className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-[-1]" aria-hidden="true">
        <defs>
          <filter id="blob-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Blob Cursor Container */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none"
        style={{
          filter: 'url(#blob-goo)',
          opacity: isCursorVisible ? 1 : 0,
          transition: 'opacity 150ms ease-out'
        }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            ref={(el) => { blobsRef.current[index] = el; }}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: `${currentSize - index * 4}px`,
              height: `${currentSize - index * 4}px`,
              backgroundColor: fillColor,
              top: 0,
              left: 0,
              transform: 'translate(-50%, -50%)',
              transition: 'background-color 0.25s ease, width 0.25s ease, height 0.25s ease'
            }}
          >
            {index === 0 && labelText && (
              <span
                ref={labelRef}
                className="whitespace-nowrap px-2 font-editorial text-[10px] font-bold tracking-widest uppercase micro-label"
                style={{
                  color: fillColor === '#1d1d1b' ? '#e2dedb' : '#1d1d1b'
                }}
              >
                {labelText}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
