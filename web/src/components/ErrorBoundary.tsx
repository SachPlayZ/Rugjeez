"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? "unknown"}]`, err, info);
  }

  reset() {
    this.setState({ hasError: false, message: "" });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Alert variant="destructive" className="flex items-start gap-3">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <AlertDescription className="text-xs">
              {this.props.label
                ? `${this.props.label} failed to render.`
                : "Something went wrong."}{" "}
              {this.state.message}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="w-fit h-6 text-xs"
              onClick={() => this.reset()}
            >
              Retry
            </Button>
          </div>
        </Alert>
      );
    }
    return this.props.children;
  }
}
