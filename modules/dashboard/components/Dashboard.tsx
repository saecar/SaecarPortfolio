"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Skeleton from "@/common/components/elements/DashboardSkeleton";
import Breakline from "@/common/components/elements/Breakline";
import { GITHUB_ACCOUNTS } from "@/common/constants/github";
import { CODEWARS_ACCOUNT } from "@/common/constants/codewars";

const Umami = dynamic(() => import("./Umami"), {
  ssr: false,
  loading: () => <Skeleton />,
});
const Contributions = dynamic(() => import("./Contributions"), {
  ssr: false,
  loading: () => <Skeleton />,
});
const CodingActive = dynamic(() => import("./CodingActive"), {
  ssr: false,
  loading: () => <Skeleton />,
});
const Codewars = dynamic(() => import("./Codewars"), {
  ssr: false,
  loading: () => <Skeleton />,
});

const Dashboard = () => {
  return (
    <>
      <Suspense fallback={<Skeleton />}>
        <Umami />
      </Suspense>
      <Breakline className="my-8" />
      <Suspense fallback={<Skeleton />}>
        <Contributions endpoint={GITHUB_ACCOUNTS.endpoint} />
      </Suspense>
      <Breakline className="my-8" />
      <Suspense fallback={<Skeleton />}>
        <CodingActive />
      </Suspense>
      <Breakline className="my-8" />
      <Suspense fallback={<Skeleton />}>
        <Codewars endpoint={CODEWARS_ACCOUNT.endpoint} />
      </Suspense>
    </>
  );
};

export default Dashboard;
