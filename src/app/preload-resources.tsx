'use client';

import ReactDOM from 'react-dom';

export function PreloadResources() {
  ReactDOM.preconnect('https://fonts.googleapis.com', { crossOrigin: '' });
  ReactDOM.preconnect('https://fonts.gstatic.com', { crossOrigin: '' });

  return null;
}
