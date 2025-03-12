const fs = require('fs');
const snarkjs = require('snarkjs');
const path = require('path');

// 获取项目根路径
const rootPath = process.cwd();

async function generateProofAndVerify() {
  console.log("\n[读取输入文件...]");
  // 读取电路输入
  const circuitInputs = JSON.parse(fs.readFileSync(path.join(rootPath, 'input.json')));
  
  console.log("\n[生成证明...]");
  try {
    // 生成证明
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        path.join(rootPath, 'generated', 'pedersen_js', 'pedersen.wasm'),
        path.join(rootPath, 'generated', 'pedersen_js', 'pedersen.zkey')
      );

    console.log("证明生成成功！");
    
    // 保存证明和公开信号
    const outputPath = path.join(rootPath, 'generated');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    fs.writeFileSync(path.join(outputPath, 'proof.json'), JSON.stringify(proof, null, 2));
    fs.writeFileSync(path.join(outputPath, 'public.json'), JSON.stringify(publicSignals, null, 2));
    
    // 读取验证key
    console.log("\n[验证证明...]");
    const verificationKeyPath = path.join(rootPath, 'generated', 'pedersen_js', 'verification_key.json');
    const vKey = JSON.parse(fs.readFileSync(verificationKeyPath));
    const verificationResult = await snarkjs.groth16.verify(
      vKey, 
      publicSignals, 
      proof
    );

    // 输出验证结果
    console.log("验证结果:", verificationResult ? "通过 ✅" : "失败 ❌");
    
    // 解析公开信号
    console.log("\n[公开信号解析]");
    console.log("Pedersen Commitment点坐标:");
    console.log("x:", publicSignals[0]);
    console.log("y:", publicSignals[1]);
    
    return { proof, publicSignals, verified: verificationResult };
    
  } catch (error) {
    console.error("生成或验证证明时出错:");
    console.error(error);
    
    // 提供更详细的错误诊断信息
    if (error.message && error.message.includes("out of bounds")) {   
      console.log("\n[可能的问题] 输入值超出电路约束范围。确保所有值在有限域内。");
    } else if (error.message && error.message.includes("cannot find module")) {
      console.log("\n[可能的问题] 找不到必要的文件。请确保已正确编译电路并生成WASM和zkey文件。");
    }
    
    throw error;
  }
}

// 执行函数
generateProofAndVerify()
  .then(() => {
    console.log("\n[完成] 所有步骤已成功执行");
    process.exit(0);
  })
  .catch(err => {
    console.log("\n[失败] 过程中出现错误");
    process.exit(1);
  });
