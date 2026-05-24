let backgroundUrl = $state("");

export function setPageBackground(url: string) {
  backgroundUrl = url;
}

export function clearPageBackground() {
  backgroundUrl = "";
}

export const pageBg = {
  get url() { return backgroundUrl; },
};
