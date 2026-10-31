import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App } from './App';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Can not find elementId root in html file');
}

const root = createRoot(container);
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/document-viewer" replace />} />
                <Route path="/document-viewer" element={<App />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
