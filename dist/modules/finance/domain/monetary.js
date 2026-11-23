export class Monetary {
    static toPaise(rupees) {
        return Math.round(rupees * 100);
    }
    static toRupees(paise) {
        return paise / 100;
    }
    static formatINR(paise) {
        const rupees = this.toRupees(paise);
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        }).format(rupees);
    }
    static calculateLateFee(dailyFeePaise, overdueDays) {
        if (overdueDays <= 0)
            return 0;
        return Math.round(dailyFeePaise * overdueDays);
    }
}
//# sourceMappingURL=monetary.js.map