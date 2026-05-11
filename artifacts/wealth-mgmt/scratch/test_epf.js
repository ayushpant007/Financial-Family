
function calculateAnnual(salary, growth, rate, years) {
    let balance = 0;
    let currentSalary = salary;
    const mRate = rate / 100 / 12;
    for (let y = 1; y <= years; y++) {
        const employeeContrib = currentSalary * 0.12;
        const epsContrib = Math.min(1250, currentSalary * 0.0833);
        const employerContrib = (currentSalary * 0.12) - epsContrib;
        const M = employeeContrib + employerContrib;
        
        let yearlyInterest = 0;
        for (let m = 1; m <= 12; m++) {
            yearlyInterest += (balance + m*M) * mRate;
        }
        balance += (M * 12) + yearlyInterest;
        currentSalary *= (1 + growth / 100);
    }
    return balance;
}

console.log("EPF 28 years (Retirement at 58) Annual Compounding:");
console.log(calculateAnnual(50000, 5, 8.25, 28).toFixed(2));
