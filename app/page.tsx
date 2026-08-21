import { RestaurantExplorer } from "@/app/_components/restaurant-explorer";
import { getPublicRestaurants } from "@/lib/data/restaurants";

export const dynamic = "force-dynamic";

export default async function Home() {
  const restaurants = await getPublicRestaurants();

  return <RestaurantExplorer restaurants={restaurants} />;
}
