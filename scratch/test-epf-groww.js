
function simulateGrowwLinearGrowth(salary, growth, interest, years) {
  let balance = 0;
  let monthlyBasic = salary;
  const iRate = interest / 100 / 12;
  const annualIncrease = salary * (growth / 100);
  
  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      // Linear increase within the year?
      // No, usually it's a step.
      const totalMonthly = monthlyBasic * 0.24;
      balance = (balance + totalMonthly) * (1 + iRate);
    }
    monthlyBasic += annualIncrease; // Simple growth on initial salary?
  }
  return balance;
}

const res7 = simulateGrowwLinearGrowth(50000, 5, 8.25, 25);
console.log("Linear Salary Growth (Step):", res7.toLocaleString('en-IN'));

function simulateGrowwCompoundedGrowth(salary, growth, interest, years) {
  let balance = 0;
  let monthlyBasic = salary;
  const iRate = interest / 100 / 12;
  
  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      const totalMonthly = monthlyBasic * 0.24;
      balance = (balance + totalMonthly) * (1 + iRate);
    }
    monthlyBasic *= (1 + growth / 100); // Compounded growth
  }
  return balance;
}

const res8 = simulateGrowwCompoundedGrowth(50000, 5, 8.25, 25);
console.log("Compounded Salary Growth (Step):", res8.toLocaleString('en-IN'));
