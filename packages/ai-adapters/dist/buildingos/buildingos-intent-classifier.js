"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingOSIntentClassifier = void 0;
const buildingos_intent_registry_1 = require("./buildingos-intent-registry");
class BuildingOSIntentClassifier {
    threshold;
    minMargin;
    definitions;
    constructor(options = {}) {
        this.threshold = options.threshold ?? 0.44;
        this.minMargin = options.minMargin ?? 0.08;
        this.definitions = (0, buildingos_intent_registry_1.getBuildingOSIntentDefinitions)();
    }
    classify(question) {
        const normalizedQuestion = this.normalize(question);
        const questionTokens = this.tokenize(normalizedQuestion);
        if (questionTokens.length === 0) {
            return {
                intentCode: null,
                score: 0,
                margin: 0,
                fallbackReason: "below_threshold",
            };
        }
        const scored = this.definitions.map((definition) => ({
            code: definition.code,
            score: this.scoreIntent(definition, normalizedQuestion, questionTokens),
        }));
        scored.sort((a, b) => b.score - a.score);
        if (scored.length === 0) {
            return {
                intentCode: null,
                score: 0,
                margin: 0,
                fallbackReason: "below_threshold",
            };
        }
        const best = scored[0];
        const second = scored[1] ?? { code: null, score: 0 };
        const margin = Math.max(0, best.score - second.score);
        if (best.score < this.threshold) {
            return {
                intentCode: null,
                score: best.score,
                margin,
                fallbackReason: "below_threshold",
            };
        }
        if (margin < this.minMargin) {
            return {
                intentCode: null,
                score: best.score,
                margin,
                fallbackReason: "low_margin",
            };
        }
        return {
            intentCode: best.code,
            score: best.score,
            margin,
        };
    }
    scoreIntent(definition, normalizedQuestion, questionTokens) {
        const exampleScore = this.bestExampleScore(definition.examples, normalizedQuestion, questionTokens);
        const hintScore = this.computeHintScore(definition.classifierHints, normalizedQuestion);
        const shortQuestionPenalty = questionTokens.length <= 2 ? 0.08 : 0;
        const score = exampleScore * 0.72 + hintScore * 0.28 - shortQuestionPenalty;
        return this.clamp01(score);
    }
    bestExampleScore(examples, normalizedQuestion, questionTokens) {
        let best = 0;
        for (const example of examples) {
            const normalizedExample = this.normalize(example);
            if (normalizedExample === normalizedQuestion) {
                return 1;
            }
            const exampleTokens = this.tokenize(normalizedExample);
            const overlapScore = this.computeOverlapScore(questionTokens, exampleTokens);
            const containmentScore = this.computeContainmentScore(normalizedQuestion, normalizedExample, questionTokens, exampleTokens);
            const candidate = overlapScore * 0.7 + containmentScore * 0.3;
            if (candidate > best) {
                best = candidate;
            }
        }
        return this.clamp01(best);
    }
    computeOverlapScore(questionTokens, exampleTokens) {
        if (questionTokens.length === 0 || exampleTokens.length === 0) {
            return 0;
        }
        const questionSet = new Set(questionTokens);
        const exampleSet = new Set(exampleTokens);
        let common = 0;
        for (const token of questionSet) {
            if (exampleSet.has(token)) {
                common += 1;
            }
        }
        const denominator = Math.max(questionSet.size, exampleSet.size);
        return denominator > 0 ? common / denominator : 0;
    }
    computeContainmentScore(normalizedQuestion, normalizedExample, questionTokens, exampleTokens) {
        if (normalizedQuestion.includes(normalizedExample)) {
            return 0.95;
        }
        if (normalizedExample.includes(normalizedQuestion) && questionTokens.length >= 3) {
            return 0.9;
        }
        const questionSet = new Set(questionTokens);
        let exampleWordsFound = 0;
        for (const token of exampleTokens) {
            if (questionSet.has(token)) {
                exampleWordsFound += 1;
            }
        }
        return exampleTokens.length > 0 ? exampleWordsFound / exampleTokens.length : 0;
    }
    computeHintScore(hints, normalizedQuestion) {
        if (hints.length === 0) {
            return 0;
        }
        const uniqueHints = new Set(hints.map((hint) => this.normalize(hint)));
        let hits = 0;
        for (const hint of uniqueHints) {
            if (hint.length === 0) {
                continue;
            }
            if (normalizedQuestion.includes(hint)) {
                hits += 1;
            }
        }
        return hits / uniqueHints.size;
    }
    normalize(value) {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
    tokenize(normalizedValue) {
        return normalizedValue
            .split(" ")
            .map((token) => token.trim())
            .filter((token) => token.length > 1);
    }
    clamp01(value) {
        if (value <= 0) {
            return 0;
        }
        if (value >= 1) {
            return 1;
        }
        return value;
    }
}
exports.BuildingOSIntentClassifier = BuildingOSIntentClassifier;
