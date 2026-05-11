
function calculateEPFWithCap(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentSalary = monthlyBasic;
  const mRate = interestRate / 12 / 100;
  const mGrowth = Math.pow(1 + growthRate / 100, 1 / 12) - 1;

  for (let m = 1; m <= years * 12; m++) {
    const empContrib = currentSalary * 0.12;
    const epsContrib = Math.min(15000 * 0.0833, currentSalary * 0.0833); // Cap is 1250
    const emprEPF = (currentSalary * 0.12) - epsContrib;
    
    const monthlyTotal = empContrib + emprEPF;
    balance = balance * (1 + mRate) + monthlyTotal;
    currentSalary *= (1 + mGrowth);
  }
  return balance;
}

const growwValue = 25941394;
const result = calculateEPFWithCap(50000, 8.25, 30, 5);

console.log("Groww expected:", growwValue);
console.log("Our calculation with EPS cap (1250):", Math.round(result));
