export type SearchResultType =
  | "client"
  | "project"
  | "inquiry"
  | "booking"
  | "payment"
  | "file"
  | "report";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}
