const regex = /(\d+\.\d)(\d+\.\d)(\d+\.\d{2})(\d+\.\d{2})(\d*\.\d{2})(\d+)(LBR.+?)SH/i;

const tests = [
    "200.0120.019.0090.001.255LBR D 16 HARD YELLOWSHPC",
    "200.090.014.0090.003.5850LBR D 16 HARD YELLOWSHPC",
    "90.050.010.00110.002.00100LBR D 16 HARD SANITIZED WHITESHPC",
    "180.014.02.50110.00.48192LBR D 16 HARD SANITIZED WHITESHPC",
    "64.091.05.0092.008.00900LBR D 22-230 IKEA WHITESHPC",
    "200.0100.020.00110.00.505LBR D 20 PH1 PINKSHPC",
    "200.0160.04.00105.00.041LBR RK 2 YELLOWSHPC"
];

for (const t of tests) {
    const m = t.match(regex);
    if (m) {
        console.log(`MATCH: ${t}`);
        console.log(`  P: ${m[1]}`);
        console.log(`  L: ${m[2]}`);
        console.log(`  T: ${m[3]}`);
        console.log(`  QtyBB: ${m[5]}`);
        console.log(`  QtyCut: ${m[6]}`);
        console.log(`  Item: ${m[7]}`);
    } else {
        console.log(`NO MATCH: ${t}`);
    }
}
