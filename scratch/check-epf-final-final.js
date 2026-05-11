
function calculateEPFFinal(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentMonthlySalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    let yearlyInterest = 0;
    for (let m = 1; m <= 12; m++) {
      const employeeContrib = currentMonthlySalary * 0.12;
      const epsPart = Math.min(1250, currentMonthlySalary * 0.0833);
      const employerEPF = (currentMonthlySalary * 0.12) - epsPart;
      const totalMonthly = employeeContrib + employerEPF;
      
      const interest = balance * mRate;
      balance += totalMonthly;
      yearlyInterest += interest;
    }
    balance += yearlyInterest;
    currentMonthlySalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
const result = calculateEPFFinal(50000, 8.25, 28, 5);

console.log("Groww expected (28 years):", growwValue);
console.log("Final Logic result (28 years):", Math.round(result));
