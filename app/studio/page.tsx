import ReviewStudio from "@/components/ReviewStudio";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ReviewStudio searchParams={resolvedSearchParams} />;
}
