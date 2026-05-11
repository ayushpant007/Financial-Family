
function calculateEPF(basic, tenure, growth, interestRate, options = {}) {
    let bal = 0;
    let s = basic;
    const totalPct = 0.24;
    const mRate = interestRate / 100 / 12;

    if (options.earlyGrowth) s *= (1 + growth / 100);

    for (let y = 1; y <= tenure; y++) {
        let yearlyInt = 0;
        for (let m = 1; m <= 12; m++) {
            const contrib = s * totalPct;
            if (options.comp === "monthly") {
                bal = (bal + contrib) * (1 + mRate);
            } else {
                bal += contrib;
                yearlyInt += bal * mRate;
            }
        }
        if (options.comp === "annual") bal += yearlyInt;
        s *= (1 + growth / 100);
    }
    return bal;
}

const target = 18947250;
function calculateEPF_Method32(basic, tenure, growth, interestRate) {
    let bal = 0;
    let s = basic;
    const c = 0.24;
    const mRate = interestRate / 100 / 12;

    for (let y = 1; y <= tenure; y++) {
        for (let m = 1; m <= 12; m++) {
            const contrib = s * c;
            // Interest on Opening Balance
            bal = bal * (1 + mRate) + contrib;
        }
        s *= (1 + growth / 100);
    }
    return bal;
}

console.log("Method 32 (Std Growth, Opening Bal Int, Monthly Comp, 25 years):", calculateEPF_Method32(50000, 25, 5, 8.25));
