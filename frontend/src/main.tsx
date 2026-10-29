import React from "react";
import { createRoot } from 'react-dom/client'
import { App } from "./App";
import { BrowserRouter } from "react-router-dom";

const container = document.getElementById("root");

if (!container) {
    throw new Error('Can not find elementId root in html file');
}

const root = createRoot(container);
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
