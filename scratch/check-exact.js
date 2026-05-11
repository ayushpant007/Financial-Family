
function calculateEPFExact(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentSalary = monthlyBasic;
  const mRate = interestRate / 12 / 100;

  for (let y = 1; y <= years; y++) {
    let yearlyInterest = 0;
    for (let m = 1; m <= 12; m++) {
      const empContrib = currentSalary * 0.12;
      const epsContrib = 1250;
      const emprEPF = (currentSalary * 0.12) - epsContrib;
      const monthlyTotal = empContrib + emprEPF;
      
      // Interest on month-start balance
      const interest = balance * mRate;
      balance += monthlyTotal;
      yearlyInterest += interest;
    }
    balance += yearlyInterest;
    currentSalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
console.log("Groww expected:", growwValue);
console.log("Exact Logic, 28 years:", Math.round(calculateEPFExact(50000, 8.25, 28, 5)));
console.log("Exact Logic, 29 years:", Math.round(calculateEPFExact(50000, 8.25, 29, 5)));
console.log("Exact Logic, 30 years:", Math.round(calculateEPFExact(50000, 8.25, 30, 5)));
