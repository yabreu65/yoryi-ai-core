import { RankingStrategy, RankingStrategyV1 } from "./ranking-strategy";

export class RankingStrategyRegistry {
  private strategies: Map<string, RankingStrategy> = new Map();
  private defaultStrategyId: string;

  constructor(strategies: RankingStrategy[] = [RankingStrategyV1], defaultStrategyId: string = "default-v1") {
    if (!defaultStrategyId) {
      throw new Error("Default strategy ID is required");
    }

    for (const strategy of strategies) {
      if (this.strategies.has(strategy.strategyId)) {
        throw new Error(`Duplicate strategyId: ${strategy.strategyId}`);
      }
      this.strategies.set(strategy.strategyId, strategy);
    }

    if (!this.strategies.has(defaultStrategyId)) {
      throw new Error(`Default strategyId '${defaultStrategyId}' does not exist in registry`);
    }

    this.defaultStrategyId = defaultStrategyId;
  }

  registerStrategy(strategy: RankingStrategy): void {
    if (this.strategies.has(strategy.strategyId)) {
      throw new Error(`Strategy with strategyId '${strategy.strategyId}' already registered`);
    }
    this.strategies.set(strategy.strategyId, strategy);
  }

  getByStrategyId(strategyId: string): RankingStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  getDefaultStrategy(): RankingStrategy {
    const strategy = this.strategies.get(this.defaultStrategyId);
    if (!strategy) {
      throw new Error(`Default strategy '${this.defaultStrategyId}' not found in registry`);
    }
    return strategy;
  }

  listStrategies(): RankingStrategy[] {
    return Array.from(this.strategies.values());
  }

  getDefaultStrategyId(): string {
    return this.defaultStrategyId;
  }
}

export const defaultRankingStrategyRegistry = new RankingStrategyRegistry([RankingStrategyV1], "default-v1");