import Script from "next/script";

import { HomeClient } from "@/app/home-client";
import { getPublicRestaurantIndex } from "@/entities/restaurant/api/restaurants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { restaurants, totalCount } = await getPublicRestaurantIndex();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <>
      <HomeClient restaurants={restaurants} totalCount={totalCount} />
      {gaMeasurementId ? (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
