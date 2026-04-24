import { type BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";
export type IntentClassificationResult = {
    intentCode: BuildingOSCanonicalIntentCode | null;
    score: number;
    margin: number;
    fallbackReason?: "below_threshold" | "low_margin";
};
export type BuildingOSIntentClassifierOptions = {
    threshold?: number;
    minMargin?: number;
};
export declare class BuildingOSIntentClassifier {
    private readonly threshold;
    private readonly minMargin;
    private readonly definitions;
    constructor(options?: BuildingOSIntentClassifierOptions);
    classify(question: string): IntentClassificationResult;
    private scoreIntent;
    private bestExampleScore;
    private computeOverlapScore;
    private computeContainmentScore;
    private computeHintScore;
    private normalize;
    private tokenize;
    private clamp01;
}
