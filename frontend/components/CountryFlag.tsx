'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LanguageCode } from '../context/LanguageContext.tsx';

interface CountryFlagProps {
  code: LanguageCode;
  className?: string;
}

export default function CountryFlag({ code, className = 'w-5 h-3.5' }: CountryFlagProps) {
  switch (code) {
    case 'vi':
      // Vietnam Flag: Red field with gold five-pointed star in the center
      return (
        <svg 
          viewBox="0 0 600 400" 
          className={`rounded-xs object-cover shadow-2xs shrink-0 ${className}`} 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="600" height="400" fill="#da251d" />
          <polygon 
            points="300,85 338,202 461,202 361,274 399,391 300,319 201,391 239,274 139,202 262,202" 
            fill="#ff0" 
          />
        </svg>
      );

    case 'en':
      // United Kingdom / Great Britain Union Jack
      return (
        <svg 
          viewBox="0 0 60 30" 
          className={`rounded-xs object-cover shadow-2xs shrink-0 ${className}`} 
          xmlns="http://www.w3.org/2000/svg"
        >
          <clipPath id="ukClip">
            <path d="M0,0 v30 h60 v-30 z"/>
          </clipPath>
          <clipPath id="ukDiag">
            <path d="M0,0 L60,30 M60,0 L0,30"/>
          </clipPath>
          {/* Blue background */}
          <rect width="60" height="30" fill="#012169" />
          {/* White diagonals */}
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          {/* Red diagonals */}
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="2" clipPath="url(#ukDiag)" />
          {/* White cross */}
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          {/* Red cross */}
          <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      );

    case 'fr':
      // France Flag: Blue, White, Red vertical tricolor
      return (
        <svg 
          viewBox="0 0 900 600" 
          className={`rounded-xs object-cover shadow-2xs shrink-0 ${className}`} 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="300" height="600" fill="#002654" />
          <rect x="300" width="300" height="600" fill="#ffffff" />
          <rect x="600" width="300" height="600" fill="#ce1126" />
        </svg>
      );

    case 'ja':
      // Japan Flag: White field with a central red disc (Hinomaru)
      return (
        <svg 
          viewBox="0 0 900 600" 
          className={`rounded-xs object-cover shadow-2xs border border-slate-200/60 shrink-0 ${className}`} 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="900" height="600" fill="#ffffff" />
          <circle cx="450" cy="300" r="180" fill="#bc002d" />
        </svg>
      );

    default:
      return null;
  }
}
