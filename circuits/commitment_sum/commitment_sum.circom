pragma circom 2.1.0;

include "../pedersen/pedersen.circom";

template CommitmentSum(n) {
    signal input x[n];
    signal input r[n];
    signal input x_total;
    
    // 输出承诺数组，每个承诺包含x和y
    signal output commitments[n][2];

    // 约束：x_1 + x_2 + ... + x_n = x_total
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += x[i];
    }
    sum === x_total;

    // 生成承诺
    component hashers[n];
    for (var i = 0; i < n; i++) {
        hashers[i] = PedersenCommitment(252);
        hashers[i].r <== r[i];
        hashers[i].a <== x[i];
        commitments[i][0] <== hashers[i].x;
        commitments[i][1] <== hashers[i].y;
    }
}


component main {public [x_total]} = CommitmentSum(3);
