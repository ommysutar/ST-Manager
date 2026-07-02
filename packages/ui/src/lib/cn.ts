import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard shadcn/ui class-merging helper: `clsx` composes conditional
 * class lists, `twMerge` then resolves conflicting Tailwind utilities
 * (e.g. a caller-supplied `bg-red-500` overriding a component's default
 * `bg-primary`) by keeping only the last one, instead of emitting both
 * and letting CSS source order decide.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
