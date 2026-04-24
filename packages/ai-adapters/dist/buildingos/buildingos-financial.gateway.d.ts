export type ResidentDebtSummary = {
    amount: number;
    currency: string;
    asOf: string;
};
export type ResidentDebtSummaryInput = {
    tenantId: string;
    userId: string;
};
export interface BuildingOSFinancialGateway {
    getResidentDebtSummary(input: ResidentDebtSummaryInput): Promise<ResidentDebtSummary | null>;
}
