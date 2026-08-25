import { RestaurantExplorer } from "@/features/restaurant-explorer/ui/restaurant-explorer";
import { getPublicRestaurantIndex } from "@/entities/restaurant/api/restaurants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { restaurants, totalCount } = await getPublicRestaurantIndex();

  return <RestaurantExplorer restaurants={restaurants} totalCount={totalCount} />;
}
