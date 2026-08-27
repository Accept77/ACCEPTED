import type { ComponentType } from "react";

import type { UserLocation } from "@/shared/lib/geo";

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
  getCurrentLocation: () => Promise<UserLocation>;
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
  getCurrentLocation: () =>
    new Promise<UserLocation>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("현재 브라우저에서는 위치 정보를 사용할 수 없어요."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            accuracy: coords.accuracy,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        reject,
        {
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: 10_000,
        },
      );
    }),
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
    window.open(url, "_blank", "noopener,noreferrer");
  },
};
