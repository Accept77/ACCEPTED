import type { ComponentType } from "react";

export type ExplorerImageProps = {
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  src: string;
};

export type ExplorerImageComponent = ComponentType<ExplorerImageProps>;

export type ExplorerSharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ExplorerShareResult = "shared" | "copied";

export type ExplorerPlatform = {
  share: (payload: ExplorerSharePayload) => Promise<ExplorerShareResult>;
  openExternalUrl?: (url: string) => Promise<void>;
};

export function isExplorerShareCancellation(error: unknown) {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }

  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return ["AbortError", "CanceledError", "UserCancelled"].includes(
    String(error.name),
  );
}

export const browserExplorerPlatform: ExplorerPlatform = {
  share: async ({ title, text, url }) => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return "shared";
      } catch (error) {
        if (isExplorerShareCancellation(error)) throw error;
      }
    }

    if (!navigator.clipboard) {
      throw new Error("공유 기능을 사용할 수 없는 브라우저예요.");
    }

    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  },
  openExternalUrl: async (url) => {
    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!openedWindow) window.location.assign(url);
  },
};
