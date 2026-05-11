
function calculateEPF_EPFO(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentSalary = monthlyBasic;
  const mRate = interestRate / 100 / 12;

  for (let y = 1; y <= years; y++) {
    let yearlyInterest = 0;
    for (let m = 1; m <= 12; m++) {
      // Interest is calculated on the balance at the START of the month
      const monthlyInterest = Math.floor(balance * mRate);
      
      const empContrib = currentSalary * 0.12;
      const epsContrib = 1250;
      const emprEPF = (currentSalary * 0.12) - epsContrib;
      const monthlyTotal = empContrib + emprEPF;
      
      balance += monthlyTotal;
      yearlyInterest += monthlyInterest;
    }
    balance += yearlyInterest;
    currentSalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
console.log("Groww expected:", growwValue);
console.log("EPFO Rule, 28 years:", Math.round(calculateEPF_EPFO(50000, 8.25, 28, 5)));
console.log("EPFO Rule, 29 years:", Math.round(calculateEPF_EPFO(50000, 8.25, 29, 5)));
console.log("EPFO Rule, 30 years:", Math.round(calculateEPF_EPFO(50000, 8.25, 30, 5)));
