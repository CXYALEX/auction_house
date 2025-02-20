// 引入依赖库
const snarkjs = require("snarkjs");          // 零知识证明库
const fs = require("fs");                    // 文件系统操作
const circomlibjs = require("circomlibjs");  // Circom 工具库
const { ethers } = require("ethers");        // 以太坊交互库

// 加载验证合约的编译产物（需先通过 snarkjs 生成）
const VerifierArtifact = require("./sc/out/Verifier.sol/Groth16Verifier.json");
const verifierABI = VerifierArtifact.abi;    // 提取合约ABI

async function main() {
  // ==================== 第一部分：初始化加密原语 ====================
  // 构建 Poseidon 哈希函数（根据电路需求）
  const poseidon = await circomlibjs.buildPoseidon();
  const input = 10;  // 示例输入值

  // ==================== 第二部分：生成零知识证明 ====================
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { in: input },                           // 私有输入（需与电路定义匹配）
    "build/poseidon_hasher_js/poseidon_hasher.wasm",  // 电路编译后的WASM模块
    "circuit_0000.zkey"                      // 可信设置生成的zKey文件
  );

  console.log("公开信号（哈希结果）:", publicSignals);
  console.log("证明详情:", JSON.stringify(proof, null, 2));

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
