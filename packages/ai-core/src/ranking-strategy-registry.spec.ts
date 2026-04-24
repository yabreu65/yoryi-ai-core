import { describe, it, expect } from "vitest";
import { RankingStrategyRegistry, defaultRankingStrategyRegistry } from "./ranking-strategy-registry";
import { RankingStrategyV1 } from "./ranking-strategy";

describe("RankingStrategyRegistry", () => {
  it("should return default strategy from predefined registry", () => {
    const strategy = defaultRankingStrategyRegistry.getDefaultStrategy();
    expect(strategy.strategyId).toBe("default-v1");
    expect(strategy.version).toBe("v1");
  });

  it("should get strategy by strategyId", () => {
    const strategy = defaultRankingStrategyRegistry.getByStrategyId("default-v1");
    expect(strategy).toBeDefined();
    expect(strategy!.version).toBe("v1");
  });

  it("should return undefined for non-existent strategyId", () => {
    const strategy = defaultRankingStrategyRegistry.getByStrategyId("non-existent");
    expect(strategy).toBeUndefined();
  });

  it("should list all strategies", () => {
    const strategies = defaultRankingStrategyRegistry.listStrategies();
    expect(strategies).toHaveLength(1);
    expect(strategies[0]!.strategyId).toBe("default-v1");
  });

  it("should throw error when defaultStrategyId does not exist", () => {
    expect(() => {
      new RankingStrategyRegistry([RankingStrategyV1], "non-existent-default");
    }).toThrow("Default strategyId 'non-existent-default' does not exist in registry");
  });

  it("should throw error when duplicate strategyId is registered", () => {
    const registry = new RankingStrategyRegistry([RankingStrategyV1], "default-v1");
    expect(() => {
      registry.registerStrategy(RankingStrategyV1);
    }).toThrow("Strategy with strategyId 'default-v1' already registered");
  });

  it("should allow registering new strategies", () => {
    const customStrategy = {
      version: "v2",
      strategyId: "custom-v2",
      weights: {
        module: 2,
        keyword: 2,
        tag: 1,
        occupant: 2,
        roleScope: 0,
      },
    };

    const registry = new RankingStrategyRegistry([RankingStrategyV1], "default-v1");
    registry.registerStrategy(customStrategy);

    const retrieved = registry.getByStrategyId("custom-v2");
    expect(retrieved).toBeDefined();
    expect(retrieved?.version).toBe("v2");
  });

  it("should return default strategy ID", () => {
    expect(defaultRankingStrategyRegistry.getDefaultStrategyId()).toBe("default-v1");
  });
});