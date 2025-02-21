#!/bin/bash
set -e  # 遇到错误立即退出


PROJECT_ROOT=$(git rev-parse --show-toplevel)

# 1. 初始化powers of tau（第一阶段）
if [ ! -f powersOfTau28_hez_final_10.ptau ]; then
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random text"
    snarkjs powersoftau prepare phase2 pot12_0001.ptau powersOfTau28_hez_final_10.ptau -v
fi

# 2. 遍历所有需要设置的电路
CIRCUITS=("commitment")
for CIRCUIT in "${CIRCUITS[@]}"
do
    # 检查并创建$CIRCUIT文件夹
    CIRCUIT_BUILD_DIR="$PROJECT_ROOT/build/$CIRCUIT"
    if [ ! -d "$CIRCUIT_BUILD_DIR" ]; then
        mkdir -p "$CIRCUIT_BUILD_DIR"
    fi
    # 3. 编译电路
    circom $PROJECT_ROOT/circuits/$CIRCUIT/${CIRCUIT}_main.circom --r1cs --wasm -o $PROJECT_ROOT/build/$CIRCUIT -l $PROJECT_ROOT/node_modules

    # 4. 执行可信设置
    snarkjs groth16 setup $PROJECT_ROOT/build/$CIRCUIT/${CIRCUIT}_main.r1cs powersOfTau28_hez_final_10.ptau $PROJECT_ROOT/build/$CIRCUIT/${CIRCUIT}_0000.zkey
    snarkjs zkey contribute $PROJECT_ROOT/build/$CIRCUIT/${CIRCUIT}_0000.zkey $PROJECT_ROOT/build/$CIRCUIT/${CIRCUIT}_final.zkey --name="Anonymous Contributor" -v -e="$(date)"
    
    # 5. 导出验证密钥
    snarkjs zkey export verificationkey $PROJECT_ROOT/build/$CIRCUIT/${CIRCUIT}_final.zkey     $PROJECT_ROOT/build/$CIRCUIT/verification_key.json
done 

echo "✅ All zkey setups completed"
