export default function Loading() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <div className="h-12 animate-pulse rounded-xl bg-line" />
        <div className="mt-6 space-y-3">
          <div className="h-32 animate-pulse rounded-xl bg-line" />
          <div className="h-32 animate-pulse rounded-xl bg-line" />
          <div className="h-32 animate-pulse rounded-xl bg-line" />
        </div>
      </div>
    </div>
  );
}
