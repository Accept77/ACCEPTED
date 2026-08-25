import { RestaurantExplorer } from "@/app/_components/restaurant-explorer";
import { getPublicRestaurantIndex } from "@/lib/data/restaurants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { restaurants, totalCount } = await getPublicRestaurantIndex();

  return <RestaurantExplorer restaurants={restaurants} totalCount={totalCount} />;
}
