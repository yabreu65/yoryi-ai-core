export type RankingWeights = {
  module: number;
  keyword: number;
  tag: number;
  occupant: number;
  roleScope: number;
};

export type RankingStrategy = {
  version: string;
  strategyId: string;
  weights: RankingWeights;
};

export const RankingStrategyV1: RankingStrategy = {
  version: "v1",
  strategyId: "default-v1",
  weights: {
    module: 1,
    keyword: 1,
    tag: 0.5,
    occupant: 1,
    roleScope: 0,
  },
};
