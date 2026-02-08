import { StockDetailClient } from "./stock-detail-client";

interface StockDetailPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { symbol } = await params;

  return <StockDetailClient symbol={symbol.toUpperCase()} />;
}
