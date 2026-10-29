import React from "react";
import { SearchBar } from "./features/document-viewer/components/SearchBar";
import { DocumentViewerContainer } from "./features/document-viewer/DocumentViewerContainer";

const Header = () => {
    return (
        <header style={
            {
                borderBottom: "2px solid #d1d5db",
                display: "flex",
                flexDirection: "column",
                width: '100%',
                margin: "0 auto"
            }
        }>
            <div style={
                {
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            }>
                <h1>VIN SEARCH ENGINE</h1>
            </div>

            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <SearchBar />
            </div>
        </header>
    );
}

const Main = () => {
    return (
        <main
            style={
                {
                    width: '100%',
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: 'flex-start',
                    flex: 1
                }
            }
        >
            <DocumentViewerContainer />
        </main>
    )
}

const Footer = () => {
    return (
        <footer style={
            {
                borderTop: "2px solid #d1d5db",
                width: '100%',
                height: '10%'
            }
        }>
            <h1>THIS IS FOOTER</h1>
        </footer>
    );
}

export function App() {
    return (
        <div className="app-container" style={
            {
                borderRight: "2px solid #d1d5db",
                borderLeft: "2px solid #d1d5db",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: '100vh',
                width: '70%',
                margin: "0 auto"
            }
        }>
            <Header />
            <Main />
            <Footer />
        </div>
    );
}
