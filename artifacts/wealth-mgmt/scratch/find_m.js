
function calculateAnnual(salary, pct, growth, rate, years) {
    let balance = 0;
    let currentSalary = salary;
    const mRate = rate / 100 / 12;
    for (let y = 1; y <= years; y++) {
        const M = currentSalary * pct;
        let yearlyInterest = 0;
        for (let m = 1; m <= 12; m++) {
            yearlyInterest += (balance + (m-1)*M) * mRate;
        }
        balance += (M * 12) + yearlyInterest;
        currentSalary *= (1 + growth / 100);
    }
    return balance;
}

function findM(target, years) {
    let low = 0;
    let high = 0.5; // 50%
    for (let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        if (calculateAnnual(50000, mid, 5, 8.25, years) < target) low = mid;
        else high = mid;
    }
    return low;
}

const target = 25941394;
console.log(`30 years needs: ${(findM(target, 30) * 100).toFixed(2)}%`);
console.log(`28 years needs: ${(findM(target, 28) * 100).toFixed(2)}%`);
