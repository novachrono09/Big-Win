import React, { Component, ErrorInfo, ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", background: "#fee", color: "red", fontFamily: "monospace", minHeight: "100vh" }}>
          <h1>Fatal Application Crash</h1>
          <p>The application encountered an unexpected error:</p>
          <pre style={{ background: "#fcc", padding: "10px", borderRadius: "5px", overflowX: "auto" }}>
            {this.state.error?.toString() || 'Unknown error'}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: "10px 20px", background: "red", color: "white", border: "none", cursor: "pointer", marginTop: "10px" }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
