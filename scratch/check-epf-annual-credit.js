
function calculateEPFAnnualCredit(monthlyBasic, totalContribPct, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    let monthlySum = 0;
    for (let m = 1; m <= 12; m++) {
      const monthlyTotal = currentMonthlySalary * (totalContribPct / 100);
      balance += monthlyTotal;
      monthlySum += balance;
    }
    const annualInterest = monthlySum * mRate;
    balance += annualInterest;
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
// Try different percentages to see what matches
console.log("Groww expected:", growwValue);
console.log("15.67% (Annual Credit):", Math.round(calculateEPFAnnualCredit(50000, 15.67, 8.25, 30, 5)));
console.log("24.00% (Annual Credit):", Math.round(calculateEPFAnnualCredit(50000, 24.00, 8.25, 30, 5)));
console.log("20.00% (Annual Credit):", Math.round(calculateEPFAnnualCredit(50000, 20.00, 8.25, 30, 5)));
