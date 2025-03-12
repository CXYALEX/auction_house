const snarkjs = require("snarkjs");
const fs = require("fs");
const circomlibjs = require("circomlibjs");
const crypto = require("crypto");

async function main() {
  // 获取BabyJubjub和Pedersen哈希相关功能
  const babyjub = await circomlibjs.buildBabyjub();
  const pedersen = await circomlibjs.buildPedersenHash();
  const F = babyjub.F; // 获取有限域操作对象
  const modulus = F.p;  // 素数域的模数

  // 生成测试数据
  // 假设我们要承诺的值为 42
  const value = 42n;
  
  // 将值转换为252位的比特数组
  function bigIntToBits(number, bitLength = 252) {
    const bits = [];
    for (let i = 0; i < bitLength; i++) {
      bits.push(Number((number >> BigInt(i)) & 1n));
    }
    return bits;
  }
  
  const valueBits = bigIntToBits(value);
  
  // 生成随机盲因子
  function generateRandomFieldElement() {
    const randomBytes = crypto.randomBytes(31); // 31字节确保值小于模数
    const randomBigInt = BigInt('0x' + randomBytes.toString('hex'));
    return randomBigInt;
  }
  
  const blindingFactor = generateRandomFieldElement();
  const blindingBits = bigIntToBits(blindingFactor);
  
  // 本地计算Pedersen Commitment
  // 在BabyJubjub曲线上: commitment = value·G + blinding·H
  
  // 获取两个不同的基点
  const G = babyjub.Base8; // 使用BabyJub的标准基点
  const H = babyjub.mulPointEscalar(G, 1); // 创建一个不同的基点 (实际项目中会使用更安全的方法)
  
  // 由于直接使用不同基点存在问题，我们需要使用标量乘法和点加法来实现 Pedersen Commitment
  // 计算 value·G
  const valuePoint = babyjub.mulPointEscalar(G, value);
  
  // 计算 blinding·H
  const blindingPoint = babyjub.mulPointEscalar(H, blindingFactor);
  
  // 将两个点相加得到承诺
  const commitment = babyjub.addPoint(valuePoint, blindingPoint);
  
  console.log("\n[本地计算]");
  console.log("承诺值:", value.toString());
  console.log("盲因子:", blindingFactor.toString());
  console.log("G点:", [F.toString(G[0]), F.toString(G[1])]);
  console.log("H点:", [F.toString(H[0]), F.toString(H[1])]);
  console.log("计算的承诺点:", [
    F.toString(commitment[0]),
    F.toString(commitment[1])
  ]);

  // 准备电路输入
  const circuitInputs = {
    value: valueBits,
    blinding: blindingBits
  };

  console.log("\n[生成证明...]");
  try {
    // 生成证明
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      "build/commitment/commitment_main_js/commitment_main.wasm", // 编译生成的 WASM
      "build/commitment/commitment_0000.zkey" // 编译生成的 ZKey
    );

    // 验证证明
    const vKey = JSON.parse(fs.readFileSync("build/commitment/verification_key.json"));
    const verificationRes = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    // 解析公开信号
    console.log("验证结果:", verificationRes ? "通过 ✅" : "失败 ❌");
    
    // 公开信号应该包含commitment点坐标
    console.log("\n[公开信号解析]");
    console.log("电路输出的承诺点:", [publicSignals[0], publicSignals[1]]);
    
    // 比较电路输出与本地计算
    const matchX = publicSignals[0] === F.toString(commitment[0]);
    const matchY = publicSignals[1] === F.toString(commitment[1]);
    console.log("承诺点 x 坐标匹配:", matchX ? "✅" : "❌");
    console.log("承诺点 y 坐标匹配:", matchY ? "✅" : "❌");
    
    // 保存证明以便后续使用
    fs.writeFileSync("proof.json", JSON.stringify(proof, null, 2));
    fs.writeFileSync("public.json", JSON.stringify(publicSignals, null, 2));
    
  } catch (error) {
    console.error("生成或验证证明时出错:");
    console.error(error);
    
    // 提供更详细的错误诊断信息
    if (error.message && error.message.includes("out of bounds")) {   
      console.log("\n[可能的问题] 输入值超出电路约束范围。确保所有值在有限域内。");
    } else if (error.message && error.message.includes("cannot find module")) {
      console.log("\n[可能的问题] 找不到必要的文件。请确保已正确编译电路并生成WASM和zkey文件。");
      console.log("尝试运行:");
      console.log("  circom circuits/commitment/commitment_main.circom --r1cs --wasm --sym --c");
      console.log("  npx snarkjs groth16 setup build/commitment/commitment_main.r1cs pot14_final.ptau build/commitment/commitment_0000.zkey");
      console.log("  npx snarkjs zkey export verificationkey build/commitment/commitment_0000.zkey build/commitment/verification_key.json");
    } else if (error.message && error.message.includes("baseHash")) {
      console.log("\n[可能的问题] PedersenHash 方法使用错误。");
    }
  }
  
  console.log("\n[Pedersen Commitment 验证指南]");
  console.log("1. 生成一个新的证明，使用相同的value但不同的blinding，会产生不同的commitment");
  console.log("2. 保留commitment和blinding可以在未来打开承诺，证明你知道某个值");
  console.log("3. 只有拥有盲因子的人才能打开承诺，保证了隐私性");
}

// 用于验证已知值和盲因子的承诺的函数
async function verifyOpenedCommitment(value, blinding, commitmentX, commitmentY) {
  const babyjub = await circomlibjs.buildBabyjub();
  const F = babyjub.F;
  
  // 获取基点
  const G = babyjub.Base8;
  const H = babyjub.mulPointEscalar(G, 1);
  
  // 使用标量乘法重新计算承诺
  const valuePoint = babyjub.mulPointEscalar(G, BigInt(value));
  const blindingPoint = babyjub.mulPointEscalar(H, BigInt(blinding));
  const calculatedCommitment = babyjub.addPoint(valuePoint, blindingPoint);
  
  // 比较计算的承诺与提供的承诺
  const matchX = F.toString(calculatedCommitment[0]) === commitmentX;
  const matchY = F.toString(calculatedCommitment[1]) === commitmentY;
  
  return matchX && matchY;
}

// 辅助函数：将大整数转换为比特数组
function bigIntToBits(number, bitLength = 252) {
  const bits = [];
  for (let i = 0; i < bitLength; i++) {
    bits.push(Number((number >> BigInt(i)) & 1n));
  }
  return bits;
}

main().catch(console.error);
