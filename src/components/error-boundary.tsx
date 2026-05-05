"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">Ha ocurrido un error.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Inténtalo de nuevo.</p>
          <Button className="mt-5" onClick={() => this.setState({ hasError: false })}>
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
