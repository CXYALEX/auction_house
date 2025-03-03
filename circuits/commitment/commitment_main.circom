pragma circom 2.0.0;

// 导入必要的组件
include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/babyjub.circom";

template PedersenCommitment() {
    signal input value[252];  // 假设值为252位
    signal input blinding[252]; // 随机盲因子
    signal output commitment[2]; // 输出承诺值 (x,y)
    
    // 使用第一个基点计算 v·H
    component valueHash = Pedersen(252);
    for (var i = 0; i < 252; i++) {
        valueHash.in[i] <== value[i];
    }
    
    // 使用第二个基点计算 r·G
    component blindingHash = Pedersen(252);
    for (var i = 0; i < 252; i++) {
        blindingHash.in[i] <== blinding[i];
    }
    
    // 将两个结果相加
    component adder = BabyAdd();
    adder.x1 <== valueHash.out[0];
    adder.y1 <== valueHash.out[1];
    adder.x2 <== blindingHash.out[0];
    adder.y2 <== blindingHash.out[1];
    
    commitment[0] <== adder.xout;
    commitment[1] <== adder.yout;
}

// 声明主组件
component main { public [ value ] } = PedersenCommitment();
