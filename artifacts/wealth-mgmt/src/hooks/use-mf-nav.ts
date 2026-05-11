import { useQuery } from "@tanstack/react-query";

const MFAPI_BASE = "https://api.mfapi.in/mf";

export type MFNavData = {
  nav: number;
  date: string;
};

export function useMFNav(schemeCode: string | null) {
  return useQuery<MFNavData>({
    queryKey: ["mf-nav", schemeCode],
    queryFn: async () => {
      const res = await fetch(`${MFAPI_BASE}/${schemeCode}`);
      if (!res.ok) throw new Error("Failed to fetch NAV");
      const json = await res.json();
      if (json.status !== "SUCCESS" || !json.data?.length) throw new Error("No NAV data");
      return {
        nav: parseFloat(json.data[0].nav),
        date: json.data[0].date,
      };
    },
    enabled: !!schemeCode,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
