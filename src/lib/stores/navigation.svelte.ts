import type { Page } from "$lib/types";

let currentPage = $state<Page>("home");
let params = $state<Record<string, string>>({});
let searchQuery = $state("");

type HistoryEntry = { page: Page; params: Record<string, string> };
let historyStack = $state<HistoryEntry[]>([]);

export function navigate(page: Page, p: Record<string, string> = {}, replace = false): void {
  if (!replace) {
    historyStack.push({ page: currentPage, params: { ...params } });
  }
  currentPage = page;
  params = p;
}

export function goBack(): void {
  if (historyStack.length > 0) {
    const entry = historyStack.pop()!;
    currentPage = entry.page;
    params = entry.params;
  }
}

export function canGoBack(): boolean {
  return historyStack.length > 0;
}

export function setSearchQuery(q: string): void {
  console.log("[navigation] setSearchQuery called with q=", q, "previous=", searchQuery);
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
  get canGoBack() {
    return canGoBack();
  },
  navigate,
  goBack,
  setSearchQuery,
};
