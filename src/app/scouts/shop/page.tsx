// app/scouts/shop/page.tsx
// What Archive Credits buy (signed in).
import { createMetadata } from "@/lib/seo";
import { ScoutShop } from "@/components/scouts/ScoutShop";

export const metadata = createMetadata({
  title: "Scouts shop",
  description: "Spend your Archive Credits.",
  path: "/scouts/shop",
  noIndex: true,
});

export default function ScoutShopPage() {
  return <ScoutShop />;
}
