
function tryMethods(basic, tenure, growth, interestRate) {
    const totalPct = 0.24;
    const mRate = interestRate / 100 / 12;

    const results = [];

    // Timing of growth
    const growthOptions = ["endOfYear", "startOfY1", "startOfY2", "monthlyGrowth"];
    // Compounding
    const compOptions = ["monthly", "annual"];
    // Interest base
    const baseOptions = ["opening", "closing"];

    for (let growthTiming of growthOptions) {
        for (let comp of compOptions) {
            for (let base of baseOptions) {
                let balance = 0;
                let monthlySalary = basic;
                if (growthTiming === "startOfY1") monthlySalary *= (1 + growth / 100);

                for (let y = 1; y <= tenure; y++) {
                    if (growthTiming === "startOfY2" && y > 1) {
                        monthlySalary *= (1 + growth / 100);
                    }
                    
                    let yearlyInterest = 0;
                    for (let m = 1; m <= 12; m++) {
                        if (growthTiming === "monthlyGrowth") {
                            monthlySalary *= Math.pow(1 + growth / 100, 1/12);
                        }
                        const totalMonthly = monthlySalary * totalPct;
                        let interestOn = 0;
                        if (base === "opening") {
                            interestOn = balance;
                        } else {
                            interestOn = balance + totalMonthly;
                        }

                        if (comp === "monthly") {
                            balance = (balance + totalMonthly) * (1 + mRate);
                        } else {
                            yearlyInterest += interestOn * mRate;
                            balance += totalMonthly;
                        }
                    }
                    if (comp === "annual") {
                        balance += yearlyInterest;
                    }
                    if (growthTiming === "endOfYear" || growthTiming === "startOfY1") {
                        monthlySalary *= (1 + growth / 100);
                    }
                }
                results.push({
                    growthTiming, comp, base, result: balance
                });
            }
        }
    }
    return results;
}

const target = 18947250;
const results = tryMethods(50000, 25, 5, 8.25);
results.forEach(r => {
    const diff = Math.abs(r.result - target);
    console.log(`${r.growthTiming} | ${r.comp} | ${r.base} => ${Math.round(r.result)} (Diff: ${Math.round(diff)})`);
});
