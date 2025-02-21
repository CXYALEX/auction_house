const snarkjs = require("snarkjs");
const fs = require("fs");
const circomlibjs = require("circomlibjs");
const crypto = require("crypto");

async function main() {
  const poseidon = await circomlibjs.buildPoseidon();
  const F = poseidon.F; // 获取有限域操作对象
  const modulus = F.p;  // 素数域的模数，例如 21888242871839275222246405745257275088548364400416034343698204186575808495617

  // 生成测试数据（需在有限域内）
  const n = 3;
  const x = [1, 2, 8].map(num => F.e(num)); // 转换为域内元素
  // const r = [
  //   F.e("123456789"),
  //   F.e("987654321"),
  //   F.e("192837465")
  // ];
  // 使用安全随机数生成器生成 r
  const generateRandomFieldElement = () => {
    // 生成一个随机的 32 字节 Buffer
    const randomBytes = crypto.randomBytes(32);
    // 将随机字节转换为一个大整数
    const randomBigInt = BigInt('0x' + randomBytes.toString('hex'));
    // 对随机数取模，确保其在有限域内
    return F.e(randomBigInt % modulus);
  };

  const r = Array.from({ length: n }, () => generateRandomFieldElement());
  const x_total = x.reduce((sum, val) => F.add(sum, val), F.e(0)); // 域内加法

  // 本地计算承诺（严格遵循域内运算）
  const localCommitments = [];
  for (let i = 0; i < n; i++) {
    const hash = poseidon([x[i], r[i]]);
    localCommitments.push(F.toString(hash)); // 转换为字符串
  }

  // 准备电路输入（确保所有值在域内）
  const circuitInputs = {
    x: x.map(val => F.toString(val)),
    r: r.map(val => F.toString(val)),
    x_total: F.toString(x_total)
  };

  // 生成证明
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    "build/commitment_sum_js/commitment_sum.wasm", // 编译生成的 WASM
    "circuit_0000.zkey" // 编译生成的 ZKey
  );

  // 验证证明
  const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
  const verificationRes = await snarkjs.groth16.verify(vKey, publicSignals, proof);

  // 解析公开信号: publicsignal中output在前面，public input在后面
  console.log("验证结果:", verificationRes ? "通过 ✅" : "失败 ❌");
  console.log("\n[公开信号解析]");
  console.log("声明的总和 (x_total):", publicSignals[n]);
  console.log("电路计算的承诺:");
  
  // 正确提取承诺（publicSignals[1], publicSignals[2], publicSignals[3]）
  for (let i = 0; i < n; i++) {
    const circuitCommitment = publicSignals[i]; // 索引从 1 开始
    const localCommitment = localCommitments[i];
    console.log(` 承诺 ${i}:`);
    console.log(`   电路输出: ${circuitCommitment}`);
    console.log(`   本地计算: ${localCommitment}`);
    console.log(`   匹配状态: ${circuitCommitment === localCommitment ? '✅' : '❌'}`);
  }
}

main().catch(console.error);







