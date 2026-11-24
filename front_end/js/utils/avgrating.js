export function avgrating(a){
    let totalScore = 0;
    totalScore = a.reduce((acc, curr) => acc + curr.rating, 0);
    let average = a.length > 0 ? (totalScore / a.length).toFixed(1) : 0;
    return average;
}