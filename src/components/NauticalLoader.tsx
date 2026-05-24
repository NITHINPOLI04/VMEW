import React, { useEffect, useState, useRef } from 'react';

const NAUTICAL_ICONS = [
  { d: 'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 8v14M8 11H4a8 8 0 0 0 15.9 1H16M8 11a4 4 0 0 0 8 0' },
  { d: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1' },
  { d: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 10C12 7 10 3 7 3S3 5 3 7c0 2.5 3.5 4.5 6 5M12 14c0 3 2 7 5 7s4-2 4-4c0-2.5-3.5-4.5-6-5M10 12c-3 0-7-2-7-5s2-4 4-4c2.5 0 4.5 3.5 5 6M14 12c3 0 7 2 7 5s-2 4-4 4c-2.5 0-4.5-3.5-5-6' },
  { d: 'M9 4h6l1 2v12l-1 2H9l-1-2V6l1-2zM9 4V2h6v2M9 18v2h6v-2M12 7v10M9 10h6M9 14h6' },
  { d: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2' },
  { d: 'M4 6c1-2 3-3 5-2s3 3 2 5-3 3-5 2M6 9c-1 2 0 5 2 6s5 1 6-1M8 15c1 2 3 3 5 2s3-3 2-5' },
  { d: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 3v2M12 19v2M3 12h2M19 12h2M16.24 7.76l-2.12 2.12M9.88 14.12l-2.12 2.12M16.24 16.24l-2.12-2.12M9.88 9.88 7.76 7.76M15 9l-3 6-3-6 3 1z' },
  { d: 'M2 20 4 7l8-4 8 4 2 13H2zM12 3v10M6 20l1-7h10l1 7M9 12h6' },
  { d: 'M2 12c1.5-3 3-4.5 4.5-4.5S9 9 10.5 9s3-1.5 4.5-1.5S18 9 19.5 9 22 7.5 22 6M2 18c1.5-3 3-4.5 4.5-4.5S9 15 10.5 15s3-1.5 4.5-1.5S18 15 19.5 15 22 13.5 22 12' },
  { d: 'M9 21h6M10 17h4M12 3a6 6 0 0 1 6 6c0 2.4-1.4 4.5-3.5 5.5L14 17h-4l-.5-2.5C7.4 13.5 6 11.4 6 9a6 6 0 0 1 6-6z' },
  { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
  { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20' },
];

const COLORS = ['#1B2D4F', '#1D9E75', '#2E7D9A', '#4A7741', '#1B2D4F', '#2E7D9A'];

const NauticalLoader: React.FC = () => {
  const [text, setText] = useState('');
  const ptsRef = useRef<HTMLDivElement>(null);

  // Typewriter effect
  useEffect(() => {
    const fullText = 'Venkateshwara Marine Electrical Works';
    let idx = 0;
    let typing = true;
    let paused = false;
    let timer: NodeJS.Timeout;

    const tick = () => {
      if (paused) return;

      if (typing) {
        if (idx <= fullText.length) {
          setText(fullText.slice(0, idx));
          idx++;
          timer = setTimeout(tick, idx < 5 ? 120 : 68);
        } else {
          paused = true;
          timer = setTimeout(() => {
            paused = false;
            typing = false;
            tick();
          }, 2200);
        }
      } else {
        if (idx > 0) {
          idx--;
          setText(fullText.slice(0, idx));
          timer = setTimeout(tick, 32);
        } else {
          paused = true;
          timer = setTimeout(() => {
            paused = false;
            typing = true;
            tick();
          }, 600);
        }
      }
    };

    tick();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Floating SVGs generation
  useEffect(() => {
    if (!ptsRef.current) return;
    const container = ptsRef.current;
    container.innerHTML = '';

    for (let i = 0; i < 30; i++) {
      const ic = NAUTICAL_ICONS[i % NAUTICAL_ICONS.length];
      const sz = 22 + Math.random() * 24;
      const xPos = Math.random() * 100; // Left position as percentage for responsiveness
      const delay = Math.random() * 8;
      const dur = 6 + Math.random() * 6;
      const col = COLORS[Math.floor(Math.random() * COLORS.length)];
      const op = 0.05 + Math.random() * 0.08;
      const bottomOffset = -30 + Math.random() * 60;

      const div = document.createElement('div');
      div.className = 'nautical-particle';
      div.style.cssText = `
        left: ${xPos}%;
        bottom: ${bottomOffset}px;
        animation-duration: ${dur}s;
        animation-delay: -${delay}s;
        position: absolute;
        pointer-events: none;
      `;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(sz));
      svg.setAttribute('height', String(sz));
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.style.opacity = String(op);

      ic.d.split('M').filter(Boolean).forEach((seg) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', 'M' + seg);
        p.setAttribute('stroke', col);
        p.setAttribute('stroke-width', '1.4');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        p.setAttribute('fill', 'none');
        svg.appendChild(p);
      });

      div.appendChild(svg);
      container.appendChild(div);
    }
  }, []);

  return (
    <div className="nautical-loader-wrap">
      <style>{`
        .nautical-loader-wrap {
          background: #ffffff;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          overflow: hidden;
          width: 100vw;
          z-index: 9999;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .nautical-particles-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .nautical-particle {
          animation: rise linear infinite;
        }
        @keyframes rise {
          0% {
            opacity: 0;
            transform: translateY(0) rotate(0deg) scale(0.8);
          }
          10% {
            opacity: 1;
          }
          75% {
            opacity: 0.22;
          }
          100% {
            opacity: 0;
            transform: translateY(-105vh) rotate(6deg) scale(1.02);
          }
        }
        .nautical-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 10;
          position: relative;
          gap: 0;
        }
        .nautical-logo-img {
          width: 96px;
          height: 96px;
          object-fit: contain;
          margin-bottom: 20px;
          border-radius: 1rem;
        }
        .nautical-typewriter-wrap {
          display: flex;
          align-items: center;
          gap: 0;
          height: 28px;
        }
        .nautical-typewriter {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.18em;
          color: #1B2D4F;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
        }
        .nautical-cursor {
          display: inline-block;
          width: 1.5px;
          height: 18px;
          background: #1D9E75;
          margin-left: 2px;
          animation: blink-cursor 0.9s step-end infinite;
          vertical-align: middle;
          border-radius: 1px;
        }
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .nautical-prog-wrap {
          margin-top: 28px;
          width: 120px;
          height: 1.5px;
          background: #EDEDED;
          border-radius: 2px;
          overflow: hidden;
        }
        .nautical-prog {
          height: 100%;
          background: #1B2D4F;
          border-radius: 2px;
          animation: pgfill-prog 3s cubic-bezier(.4, 0, .2, 1) infinite;
        }
        @keyframes pgfill-prog {
          0% { width: 0%; }
          75% { width: 88%; }
          92% { width: 96%; }
          100% { width: 96%; }
        }
      `}</style>

      <div className="nautical-particles-container" ref={ptsRef} />
      
      <div className="nautical-center">
        <img 
          className="nautical-logo-img" 
          src="/VMEW.jpg" 
          alt="VMEW Logo"
          onError={(e) => {
            const target = e.currentTarget;
            target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%231b2d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
          }}
        />
        <div className="nautical-typewriter-wrap">
          <div className="nautical-typewriter">{text}</div>
          <div className="nautical-cursor" />
        </div>
        <div className="nautical-prog-wrap">
          <div className="nautical-prog" />
        </div>
      </div>
    </div>
  );
};

export default NauticalLoader;
