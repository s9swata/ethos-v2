import type { Page } from "$lib/types";

let currentPage = $state<Page>("home");
let params = $state<Record<string, string>>({});
let searchQuery = $state("");

export function navigate(page: Page, p: Record<string, string> = {}): void {
  currentPage = page;
  params = p;
}

export function setSearchQuery(q: string): void {
  searchQuery = q;
}

export const nav = {
  get currentPage() {
    return currentPage;
  },
  get params() {
    return params;
  },
  get searchQuery() {
    return searchQuery;
  },
  navigate,
  setSearchQuery,
};
