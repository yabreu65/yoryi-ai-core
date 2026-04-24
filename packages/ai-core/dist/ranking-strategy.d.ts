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
export declare const RankingStrategyV1: RankingStrategy;
