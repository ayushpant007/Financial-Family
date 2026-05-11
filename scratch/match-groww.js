
function matchGroww() {
    const target = 18947250;
    const basic = 50000;
    const growth = 0.05;
    const rate = 0.0825;

    const mRates = [
        { name: "Nominal (r/12)", r: 0.0825 / 12 },
        { name: "Effective ((1+r)^(1/12)-1)", r: Math.pow(1.0825, 1/12) - 1 }
    ];

    const scenarios = [
        { name: "Monthly Growth (1.05^(1/12))", g: Math.pow(1.05, 1/12) - 1 },
        { name: "Monthly Growth (0.05/12)", g: 0.05 / 12 }
    ];

    for (let mr of mRates) {
        for (let s of scenarios) {
            // Ordinary Annuity (End of month)
            let bal = 0;
            let pmt = basic * 0.24 * (1 + growth / 100); // Early growth
            for (let m = 1; m <= 300; m++) {
                bal = bal * (1 + mr.r) + pmt;
                pmt *= (1 + s.g);
            }
            console.log(`${mr.name} | ${s.name} | Early Growth | Ordinary => ${Math.round(bal)} (Diff: ${Math.round(bal - target)})`);
        }
    }
}
matchGroww();
