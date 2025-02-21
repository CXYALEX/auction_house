pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

template CommitmentSum(n) {
    signal input x[n];
    signal input r[n];
    signal input x_total;
    
    // 输出承诺数组
    signal output commitments[n];

    // 约束：x_1 + x_2 + ... + x_n = x_total
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += x[i];
    }
    sum === x_total;

    // 生成承诺
    component hashers[n];
    for (var i = 0; i < n; i++) {
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== x[i];
        hashers[i].inputs[1] <== r[i];
        commitments[i] <== hashers[i].out;
    }
}

component main {public [x_total]} = CommitmentSum(3);
