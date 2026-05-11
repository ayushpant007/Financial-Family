
function calculateEPFFinal(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    let yearlyInterest = 0;
    for (let m = 1; m <= 12; m++) {
      // 1. Interest on opening balance
      const interest = balance * mRate;
      
      // 2. Contributions
      const empContrib = currentMonthlySalary * 0.12;
      const epsPart = Math.min(1250, currentMonthlySalary * 0.0833);
      const emprEPF = (currentMonthlySalary * 0.12) - epsPart;
      const totalMonthly = empContrib + emprEPF;
      
      balance += totalMonthly;
      yearlyInterest += interest;
    }
    // 3. Credit interest at end of year
    balance += yearlyInterest;
    // 4. Annual growth
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
console.log("Groww expected:", growwValue);
console.log("Final Logic, 30 years:", Math.round(calculateEPFFinal(50000, 8.25, 30, 5)));
