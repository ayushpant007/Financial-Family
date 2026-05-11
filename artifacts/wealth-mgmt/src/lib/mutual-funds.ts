import fundsData from "./mutual-funds-data.json";

export type MutualFundOption = {
  name: string;
  code: string;
};

export const mutualFundOptions: MutualFundOption[] = fundsData as MutualFundOption[];

export function searchMutualFunds(query: string): MutualFundOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return mutualFundOptions.slice(0, 50);
  return mutualFundOptions
    .filter((fund) => `${fund.name} ${fund.code}`.toLowerCase().includes(normalized))
    .slice(0, 50);
}

export function getFundCode(name: string): string | null {
  const match = mutualFundOptions.find(
    (f) => f.name.toLowerCase() === name.trim().toLowerCase()
  );
  return match?.code ?? null;
}
