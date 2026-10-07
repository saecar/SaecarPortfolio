import { useTranslations } from "next-intl";

import { CodewarsData } from "@/common/types/codewars";

import OverviewItem from "./OverviewItem";

interface OverviewProps {
  data: CodewarsData;
}

const Overview = ({ data }: OverviewProps) => {
  const t = useTranslations("DashboardPage.codewars");

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4">
        <OverviewItem
          label={t("title_rank")}
          value={Math.abs(data?.ranks?.overall?.rank || 0)}
          unit="kyu"
        />
        <OverviewItem label={t("title_honor")} value={data?.honor ?? 0} />
        <OverviewItem
          label={t("title_completed")}
          value={data?.codeChallenges?.totalCompleted ?? 0}
        />
        <OverviewItem
          label={t("title_leaderboard")}
          value={data?.leaderboardPosition ? data?.leaderboardPosition : 0}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 py-2 capitalize sm:grid-cols-2">
        <OverviewItem label={t("title_clan")} value={data?.clan || "-"} />
        <OverviewItem
          label={t("title_skills")}
          value={data?.skills?.length ? data.skills.join(", ") : "-"}
        />
      </div>
    </div>
  );
};

export default Overview;
