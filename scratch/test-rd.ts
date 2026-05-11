
const P = 60000;
const R = 0.071;
const T = 15;

// Formula 1: Annuity Immediate (End of year)
const f1 = P * (Math.pow(1 + R, T) - 1) / R;
console.log("Annuity Immediate:", f1);

// Formula 2: Annuity Due (Beginning of year)
const f2 = P * (Math.pow(1 + R, T) - 1) / R * (1 + R);
console.log("Annuity Due:", f2);

// Formula 3: Groww/Standard PPF (Yearly compounding, deposit at start)
// The standard formula often used is F = P [({(1+i)^n}-1)/i] * (1+i)
// Wait, f2 is that formula. 

// Let's check if Groww uses a different R or T.
// 16,27,284
console.log("Groww Target:", 1627284);

// Wait! Maybe the formula is F = P [({(1+i)^n}-1)/i] 
// But i is calculated differently? 

// Let's try to calculate year by year
let balance = 0;
for (let i = 0; i < T; i++) {
    balance = (balance + P) * (1 + R);
}
console.log("Year-by-year (Begin):", balance);

let balanceEnd = 0;
for (let i = 0; i < T; i++) {
    balanceEnd = balanceEnd * (1 + R) + P;
}
console.log("Year-by-year (End):", balanceEnd);
