
function calculateEPFAnnualGrowth(monthlyBasic, contributionPct, employerContribPct, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      const monthlyTotal = currentMonthlySalary * (contributionPct / 100 + employerContribPct / 100);
      balance = balance * (1 + mRate) + monthlyTotal;
    }
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
const result1567 = calculateEPFAnnualGrowth(50000, 12, 3.67, 8.25, 30, 5);
const result24 = calculateEPFAnnualGrowth(50000, 12, 12, 8.25, 30, 5);

console.log("Groww expected:", growwValue);
console.log("Annual Growth (15.67%):", Math.round(result1567));
console.log("Annual Growth (24.00%):", Math.round(result24));
