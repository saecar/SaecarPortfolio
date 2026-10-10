import React from "react";

const DashboardSkeleton = () => {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-6 w-1/4 rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-32 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800/60" />
    </div>
  );
};

export default DashboardSkeleton;
