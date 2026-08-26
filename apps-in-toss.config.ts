import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "hungry-jinsu",
  brand: {
    primaryColor: "#2f6fed",
  },
  permissions: [{ name: "geolocation", access: "access" }],
  webBundleDir: "dist",
  webView: {
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: "never",
    pullToRefreshEnabled: false,
  },
});
