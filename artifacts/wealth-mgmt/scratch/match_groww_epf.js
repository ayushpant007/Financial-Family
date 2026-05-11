
function calculateEPF(monthlySalary, age, annualIncrease, interestRate, employerModel) {
    let currentSalary = monthlySalary;
    let balance = 0;
    let totalContribution = 0;
    const years = 60 - age;

    for (let year = 1; year <= years; year++) {
        let yearInterest = 0;
        for (let month = 1; month <= 12; month++) {
            let employeeContrib = currentSalary * 0.12;
            let employerContrib = 0;

            if (employerModel === 'full_12') {
                employerContrib = currentSalary * 0.12;
            } else if (employerModel === 'statutory') {
                const eps = Math.min(currentSalary, 15000) * 0.0833;
                employerContrib = (currentSalary * 0.12) - eps;
            } else if (employerModel === 'only_3.67') {
                employerContrib = currentSalary * 0.0367;
            } else if (employerModel === 'percent_8.33') {
                employerContrib = currentSalary * 0.0833;
            } else if (employerModel === 'percent_8.8') {
                employerContrib = currentSalary * 0.088;
            }

            balance += employeeContrib + employerContrib;
            totalContribution += employeeContrib + employerContrib;
            yearInterest += balance * (interestRate / 12 / 100);
        }
        balance += yearInterest;
        currentSalary *= (1 + annualIncrease / 100);
    }
    return balance;
}

const salary = 50000;
const age = 30;
const increase = 5;
const rate = 8.25;

console.log("Groww target: 25941394");
console.log("Model Full 12% (Total 24%):", calculateEPF(salary, age, increase, rate, 'full_12').toLocaleString());
console.log("Model Statutory (12% + 12% - 1250):", calculateEPF(salary, age, increase, rate, 'statutory').toLocaleString());
console.log("Model Only 3.67% (Total 15.67%):", calculateEPF(salary, age, increase, rate, 'only_3.67').toLocaleString());
console.log("Model 8.33% Employer (Total 20.33%):", calculateEPF(salary, age, increase, rate, 'percent_8.33').toLocaleString());
console.log("Model 8.5% Employer (Total 20.5%):", calculateEPF(salary, age, increase, rate, 'percent_8.5').toLocaleString());
console.log("Model 8.8% Employer (Total 20.8%):", calculateEPF(salary, age, increase, rate, 'percent_8.8').toLocaleString());

function calculateEPF_OpeningOnly(monthlySalary, age, annualIncrease, interestRate, employerModel) {
    let currentSalary = monthlySalary;
    let balance = 0;
    const years = 60 - age;

    for (let year = 1; year <= years; year++) {
        let yearInterest = 0;
        for (let month = 1; month <= 12; month++) {
            let employeeContrib = currentSalary * 0.12;
            let employerContrib = 0;

            if (employerModel === 'statutory') {
                const eps = Math.min(currentSalary, 15000) * 0.0833;
                employerContrib = (currentSalary * 0.12) - eps;
            } else if (employerModel === 'percent_8.8') {
                employerContrib = currentSalary * 0.088;
            }

            // Interest on balance BEFORE adding this month's contribution
            yearInterest += balance * (interestRate / 12 / 100);
            balance += employeeContrib + employerContrib;
        }
        balance += yearInterest;
        currentSalary *= (1 + annualIncrease / 100);
    }
    return balance;
}

console.log("Model Statutory (Opening Only):", calculateEPF_OpeningOnly(salary, age, increase, rate, 'statutory').toLocaleString());
console.log("Model 8.8% (Opening Only):", calculateEPF_OpeningOnly(salary, age, increase, rate, 'percent_8.8').toLocaleString());

function calculateEPF_MonthlyCompounding(monthlySalary, age, annualIncrease, interestRate, employerModel) {
    let currentSalary = monthlySalary;
    let balance = 0;
    const years = 60 - age;
    const r = interestRate / 12 / 100;

    for (let year = 1; year <= years; year++) {
        for (let month = 1; month <= 12; month++) {
            let employeeContrib = currentSalary * 0.12;
            let employerContrib = 0;

            if (employerModel === 'statutory') {
                const eps = Math.min(currentSalary, 15000) * 0.0833;
                employerContrib = (currentSalary * 0.12) - eps;
            } else if (employerModel === 'percent_8.33') {
                employerContrib = currentSalary * 0.0833;
            }

            balance += employeeContrib + employerContrib;
            balance *= (1 + r); // Compounded every month
        }
        currentSalary *= (1 + annualIncrease / 100);
    }
    return balance;
}

console.log("Model 8.33% (Monthly Compounding):", calculateEPF_MonthlyCompounding(salary, age, increase, rate, 'percent_8.33').toLocaleString());
console.log("Model Statutory (Monthly Compounding):", calculateEPF_MonthlyCompounding(salary, age, increase, rate, 'statutory').toLocaleString());

function calculateEPF_Age58(monthlySalary, age, annualIncrease, interestRate, employerModel) {
    let currentSalary = monthlySalary;
    let balance = 0;
    const years = 58 - age;

    for (let year = 1; year <= years; year++) {
        let yearInterest = 0;
        for (let month = 1; month <= 12; month++) {
            let employeeContrib = currentSalary * 0.12;
            let employerContrib = 0;

            if (employerModel === 'statutory') {
                const eps = Math.min(currentSalary, 15000) * 0.0833;
                employerContrib = (currentSalary * 0.12) - eps;
            }

            balance += employeeContrib + employerContrib;
            yearInterest += balance * (interestRate / 12 / 100);
        }
        balance += yearInterest;
        currentSalary *= (1 + annualIncrease / 100);
    }
    return balance;
}

console.log("Model Statutory (Age 58):", calculateEPF_Age58(salary, age, increase, rate, 'statutory').toLocaleString());
