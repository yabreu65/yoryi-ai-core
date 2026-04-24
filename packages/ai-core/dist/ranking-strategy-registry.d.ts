import { RankingStrategy } from "./ranking-strategy";
export declare class RankingStrategyRegistry {
    private strategies;
    private defaultStrategyId;
    constructor(strategies?: RankingStrategy[], defaultStrategyId?: string);
    registerStrategy(strategy: RankingStrategy): void;
    getByStrategyId(strategyId: string): RankingStrategy | undefined;
    getDefaultStrategy(): RankingStrategy;
    listStrategies(): RankingStrategy[];
    getDefaultStrategyId(): string;
}
export declare const defaultRankingStrategyRegistry: RankingStrategyRegistry;
