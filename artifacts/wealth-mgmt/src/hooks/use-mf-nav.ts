import { useQuery } from "@tanstack/react-query";

const MFAPI_BASE = "https://api.mfapi.in/mf";

export type MFNavData = {
  nav: number;
  date: string;
};

export type MFNavHistoryEntry = {
  date: string;       // raw date string from AMFI e.g. "29-05-2024"
  nav: number;
};

export type MFNavFullData = {
  nav: number;
  date: string;
  history: MFNavHistoryEntry[];  // all historical rows, newest first
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

/** Fetches the full NAV history (for projection dialog). */
export function useMFNavFull(schemeCode: string | null) {
  return useQuery<MFNavFullData>({
    queryKey: ["mf-nav-full", schemeCode],
    queryFn: async () => {
      const res = await fetch(`${MFAPI_BASE}/${schemeCode}`);
      if (!res.ok) throw new Error("Failed to fetch NAV");
      const json = await res.json();
      if (json.status !== "SUCCESS" || !json.data?.length) throw new Error("No NAV data");
      const history: MFNavHistoryEntry[] = (json.data as any[]).map((d: any) => ({
        date: d.date,
        nav: parseFloat(d.nav),
      }));
      return {
        nav: history[0].nav,
        date: history[0].date,
        history,
      };
    },
    enabled: !!schemeCode,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
