
function findMatch() {
    const target = 18947250;
    const salary = 50000;
    const growth = 0.05;
    const rate = 0.0825;
    const mRate = rate / 12;

    const tenures = [25, 26, 27];
    const contribs = [0.1567, 0.215, 0.24]; // 15.67% (EPF), 21.5% (EPF with EPS cap), 24% (Total)

    for (let t of tenures) {
        for (let c of contribs) {
            // Try monthly comp
            let bal = 0;
            let s = salary;
            for (let y = 1; y <= t; y++) {
                for (let m = 1; m <= 12; m++) {
                    bal = (bal + s * c) * (1 + mRate);
                }
                s *= (1 + growth);
            }
            console.log(`Monthly Comp | T: ${t} | C: ${c} => ${Math.round(bal)} (Diff: ${Math.round(bal - target)})`);

            // Try annual comp
            bal = 0;
            s = salary;
            for (let y = 1; y <= t; y++) {
                let yearlyInt = 0;
                for (let m = 1; m <= 12; m++) {
                    let contrib = s * c;
                    bal += contrib;
                    yearlyInt += bal * mRate;
                }
                bal += yearlyInt;
                s *= (1 + growth);
            }
            console.log(`Annual Comp | T: ${t} | C: ${c} => ${Math.round(bal)} (Diff: ${Math.round(bal - target)})`);
        }
    }
}
findMatch();
