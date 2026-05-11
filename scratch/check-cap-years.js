
function calculateEPFWithCap(monthlyBasic, interestRate, years, growthRate) {
  let balance = 0;
  let currentSalary = monthlyBasic;
  const mRate = interestRate / 12 / 100;

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      const empContrib = currentSalary * 0.12;
      const epsContrib = 1250; // Constant cap
      const emprEPF = (currentSalary * 0.12) - epsContrib;
      
      const monthlyTotal = empContrib + emprEPF;
      balance = balance * (1 + mRate) + monthlyTotal;
    }
    currentSalary *= (1 + growthRate / 100);
  }
  return balance;
}

const growwValue = 25941394;
console.log("Groww expected:", growwValue);
console.log("Cap 1250, 28 years:", Math.round(calculateEPFWithCap(50000, 8.25, 28, 5)));
console.log("Cap 1250, 29 years:", Math.round(calculateEPFWithCap(50000, 8.25, 29, 5)));
console.log("Cap 1250, 30 years:", Math.round(calculateEPFWithCap(50000, 8.25, 30, 5)));
