
function calculateEPF(monthlyBasic, totalContribPct, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      const monthlyTotal = currentMonthlySalary * (totalContribPct / 100);
      balance = balance * (1 + mRate) + monthlyTotal;
    }
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
console.log("Groww expected:", growwValue);
console.log("24.00% for 28 years:", Math.round(calculateEPF(50000, 24.00, 8.25, 28, 5)));
console.log("24.00% for 29 years:", Math.round(calculateEPF(50000, 24.00, 8.25, 29, 5)));
console.log("24.00% for 30 years:", Math.round(calculateEPF(50000, 24.00, 8.25, 30, 5)));
