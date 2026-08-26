import { openURL, share } from "@apps-in-toss/web-framework";

import type { ExplorerPlatform } from "@/features/restaurant-explorer/model/platform";
import { browserExplorerPlatform } from "@/features/restaurant-explorer/model/platform";

function isAppsInTossWebView() {
  return (
    typeof window !== "undefined" &&
    (window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}

export const appsInTossPlatform: ExplorerPlatform = {
  openExternalUrl: (url) =>
    isAppsInTossWebView()
      ? openURL(url)
      : browserExplorerPlatform.openExternalUrl!(url),
  share: async ({ title, text, url }) => {
    if (!isAppsInTossWebView()) {
      return browserExplorerPlatform.share({ title, text, url });
    }

    await share({ message: [title, text, url].filter(Boolean).join("\n") });
    return "shared";
  },
};
