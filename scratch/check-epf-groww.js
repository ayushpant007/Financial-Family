
function calculateGrowwEPF(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      const monthlyTotal = currentMonthlySalary * 0.1567; // 12% + 3.67%
      const interestForMonth = (balance + monthlyTotal) * mRate;
      balance = balance + monthlyTotal + interestForMonth;
    }
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
const result = calculateGrowwEPF(50000, 8.25, 30, 5);

console.log("Groww expected:", growwValue);
console.log("Groww Formula result:", Math.round(result));
