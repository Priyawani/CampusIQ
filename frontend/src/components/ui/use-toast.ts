import * as React from "react";
import { toast as toastManager } from "./toast";

export type ToastVariant = "default" | "destructive" | "success" | "info" | "warning" | "error" | "loading";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Legacy shadcn variant prop. `"destructive"` maps to the error style. */
  variant?: ToastVariant;
  /** New Base UI toast type. Takes precedence over `variant` when both are provided. */
  type?: string;
  timeout?: number;
}

function resolveType(variant?: ToastVariant, type?: string): string | undefined {
  if (type) return type;
  if (!variant || variant === "default") return undefined;
  if (variant === "destructive") return "error";
  return variant;
}

function showToast({ title, description, variant, type, timeout }: ToastOptions): string {
  return toastManager.add({
    title,
    description,
    type: resolveType(variant, type),
    ...(timeout !== undefined ? { timeout } : {}),
  });
}

/**
 * Compatibility hook matching the classic shadcn `use-toast` API:
 *
 * ```tsx
 * const { toast } = useToast();
 * toast({ title: "Prediction Failed", description: "...", variant: "destructive" });
 * ```
 */
export function useToast() {
  return {
    toast: showToast,
    dismiss: (toastId?: string) => toastManager.close(toastId),
  };
}

export { showToast as toast };
