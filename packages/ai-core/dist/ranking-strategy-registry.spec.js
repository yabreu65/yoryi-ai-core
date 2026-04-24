"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ranking_strategy_registry_1 = require("./ranking-strategy-registry");
const ranking_strategy_1 = require("./ranking-strategy");
(0, vitest_1.describe)("RankingStrategyRegistry", () => {
    (0, vitest_1.it)("should return default strategy from predefined registry", () => {
        const strategy = ranking_strategy_registry_1.defaultRankingStrategyRegistry.getDefaultStrategy();
        (0, vitest_1.expect)(strategy.strategyId).toBe("default-v1");
        (0, vitest_1.expect)(strategy.version).toBe("v1");
    });
    (0, vitest_1.it)("should get strategy by strategyId", () => {
        const strategy = ranking_strategy_registry_1.defaultRankingStrategyRegistry.getByStrategyId("default-v1");
        (0, vitest_1.expect)(strategy).toBeDefined();
        (0, vitest_1.expect)(strategy.version).toBe("v1");
    });
    (0, vitest_1.it)("should return undefined for non-existent strategyId", () => {
        const strategy = ranking_strategy_registry_1.defaultRankingStrategyRegistry.getByStrategyId("non-existent");
        (0, vitest_1.expect)(strategy).toBeUndefined();
    });
    (0, vitest_1.it)("should list all strategies", () => {
        const strategies = ranking_strategy_registry_1.defaultRankingStrategyRegistry.listStrategies();
        (0, vitest_1.expect)(strategies).toHaveLength(1);
        (0, vitest_1.expect)(strategies[0].strategyId).toBe("default-v1");
    });
    (0, vitest_1.it)("should throw error when defaultStrategyId does not exist", () => {
        (0, vitest_1.expect)(() => {
            new ranking_strategy_registry_1.RankingStrategyRegistry([ranking_strategy_1.RankingStrategyV1], "non-existent-default");
        }).toThrow("Default strategyId 'non-existent-default' does not exist in registry");
    });
    (0, vitest_1.it)("should throw error when duplicate strategyId is registered", () => {
        const registry = new ranking_strategy_registry_1.RankingStrategyRegistry([ranking_strategy_1.RankingStrategyV1], "default-v1");
        (0, vitest_1.expect)(() => {
            registry.registerStrategy(ranking_strategy_1.RankingStrategyV1);
        }).toThrow("Strategy with strategyId 'default-v1' already registered");
    });
    (0, vitest_1.it)("should allow registering new strategies", () => {
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
        const registry = new ranking_strategy_registry_1.RankingStrategyRegistry([ranking_strategy_1.RankingStrategyV1], "default-v1");
        registry.registerStrategy(customStrategy);
        const retrieved = registry.getByStrategyId("custom-v2");
        (0, vitest_1.expect)(retrieved).toBeDefined();
        (0, vitest_1.expect)(retrieved?.version).toBe("v2");
    });
    (0, vitest_1.it)("should return default strategy ID", () => {
        (0, vitest_1.expect)(ranking_strategy_registry_1.defaultRankingStrategyRegistry.getDefaultStrategyId()).toBe("default-v1");
    });
});
