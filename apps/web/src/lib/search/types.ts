export type SearchResultType = "client" | "project" | "inquiry" | "booking" | "payment";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}
