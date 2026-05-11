
function calculateEPF(monthlyBasic, contributionPct, employerContribPct, interestRate, years, growthRate) {
  let balance = 0;
  let currentSalary = monthlyBasic;
  const mRate = interestRate / 12 / 100;
  const mGrowth = Math.pow(1 + growthRate / 100, 1 / 12) - 1;

  for (let m = 1; m <= years * 12; m++) {
    const monthlyTotal = currentSalary * (contributionPct / 100 + employerContribPct / 100);
    // Interest is calculated on the opening balance of the month
    balance = balance * (1 + mRate) + monthlyTotal;
    currentSalary *= (1 + mGrowth);
  }
  return balance;
}

const growwValue = 25941394;
const ourValue1567 = calculateEPF(50000, 12, 3.67, 8.25, 30, 5);
const ourValue24 = calculateEPF(50000, 12, 12, 8.25, 30, 5);

console.log("Groww expected:", growwValue);
console.log("Our calculation (15.67%):", Math.round(ourValue1567));
console.log("Our calculation (24.00%):", Math.round(ourValue24));
