/**
 * Base corner radius. Every derived radius (sm/md/lg/xl — see the
 * generated `src/css/tokens.css`) is computed from this single value via
 * CSS `calc()`, matching the shadcn/ui convention: change this one token
 * to re-scale every rounded corner in the product.
 */
export const baseRadius = "0.625rem";
