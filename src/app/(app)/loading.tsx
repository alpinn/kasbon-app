import { ListSkeleton, SummarySkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SummarySkeleton />
      <ListSkeleton />
    </div>
  );
}
