// 引入依赖库
const snarkjs = require("snarkjs");          // 零知识证明库
const fs = require("fs");                    // 文件系统操作
const circomlibjs = require("circomlibjs");  // Circom 工具库
const { ethers } = require("ethers");        // 以太坊交互库
const crypto = require("crypto");

// 加载验证合约的编译产物（需先通过 snarkjs 生成）
const VerifierArtifact = require("./sc/out/Verifier.sol/Groth16Verifier.json");
const verifierABI = VerifierArtifact.abi;    // 提取合约ABI

async function main() {
  // ==================== 第一部分：初始化加密原语 ====================
  const poseidon = await circomlibjs.buildPoseidon();
  const F = poseidon.F; // 获取有限域操作对象
  const modulus = F.p;  // 素数域的模数，例如 21888242871839275222246405745257275088548364400416034343698204186575808495617

  // 生成测试数据（需在有限域内）
  const n = 3;
  const x = [1, 2, 8].map(num => F.e(num)); // 转换为域内元素
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


  // ==================== 第三部分：准备链上验证参数 ====================
  // 转换公共信号为十进制字符串（解决BigNumber格式问题）
  const inputs = publicSignals.map(x => BigInt(x).toString());

  // 获取符合Solidity调用格式的calldata
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  
  // 解析calldata为结构化参数（注意：这里使用JSON.parse处理数组结构）
  const [a, b, c, _] = JSON.parse(`[${calldata}]`);  // 解构赋值获取证明的a/b/c部分

  // ==================== 第四部分：连接以太坊网络 ====================
  // 初始化以太坊提供者（这里使用Hardhat本地节点）
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // 加载钱包（示例私钥，仅用于测试环境！）
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat默认账户私钥
    provider
  );

  // ==================== 第五部分：链上验证 ====================
  // 初始化验证合约（地址需替换为实际部署地址）
  const verifierAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Hardhat默认首个合约地址
  const verifier = new ethers.Contract(verifierAddress, verifierABI, signer);

  try {
    // 调用合约的验证方法
    const isValid = await verifier.verifyProof(
      a,     // G1点 - 证明的第一部分
      b,     // G2点 - 证明的第二部分
      c,     // G1点 - 证明的第三部分
      inputs // 公共输入信号数组
    );
    
    console.log("链上验证结果:", isValid ? "✅ 验证通过" : "❌ 验证失败");
  } catch (err) {
    // 错误处理（包含revert原因捕获）
    console.error("验证失败:", err.reason || err.message);
  }
}

// 执行主函数并捕获异常
main().catch(console.error);
