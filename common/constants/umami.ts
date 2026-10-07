export const UMAMI_ACCOUNT = {
  username: "Satria Bahari",
  api_key: process.env.UMAMI_API_KEY,
  base_url: "https://api.umami.is/v1/websites",
  endpoint: {
    page_views: "/pageviews",
    sessions: "/sessions/stats",
  },
  get parameters() {
    return {
      startAt: 1717174800000, // 1 Juni 2024 00:00 WIB
      endAt: Date.now(), // Current date
      unit: "month",
      timezone: "Asia/Jakarta",
    };
  },
  is_active: true,
  websites: [
    {
      domain: "satriabahari.my.id",
      website_id: process.env.UMAMI_WEBSITE_ID_MYID,
      umami_url:
        "https://cloud.umami.is/share/YBbXz2wWG0lCgSLt/www.satriabahari.my.id",
    },
    {
      domain: "satriabahari.site",
      website_id: process.env.UMAMI_WEBSITE_ID_SITE,
      umami_url:
        "https://us.umami.is/share/wg6XA2bPFWg8Qc7r/www.satriabahari.site",
    },
  ],
};
