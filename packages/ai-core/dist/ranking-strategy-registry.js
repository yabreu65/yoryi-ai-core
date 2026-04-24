"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRankingStrategyRegistry = exports.RankingStrategyRegistry = void 0;
const ranking_strategy_1 = require("./ranking-strategy");
class RankingStrategyRegistry {
    strategies = new Map();
    defaultStrategyId;
    constructor(strategies = [ranking_strategy_1.RankingStrategyV1], defaultStrategyId = "default-v1") {
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
    registerStrategy(strategy) {
        if (this.strategies.has(strategy.strategyId)) {
            throw new Error(`Strategy with strategyId '${strategy.strategyId}' already registered`);
        }
        this.strategies.set(strategy.strategyId, strategy);
    }
    getByStrategyId(strategyId) {
        return this.strategies.get(strategyId);
    }
    getDefaultStrategy() {
        const strategy = this.strategies.get(this.defaultStrategyId);
        if (!strategy) {
            throw new Error(`Default strategy '${this.defaultStrategyId}' not found in registry`);
        }
        return strategy;
    }
    listStrategies() {
        return Array.from(this.strategies.values());
    }
    getDefaultStrategyId() {
        return this.defaultStrategyId;
    }
}
exports.RankingStrategyRegistry = RankingStrategyRegistry;
exports.defaultRankingStrategyRegistry = new RankingStrategyRegistry([ranking_strategy_1.RankingStrategyV1], "default-v1");
