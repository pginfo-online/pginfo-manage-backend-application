export declare class Monetary {
    static toPaise(rupees: number): number;
    static toRupees(paise: number): number;
    static formatINR(paise: number): string;
    static calculateLateFee(dailyFeePaise: number, overdueDays: number): number;
}
