const snarkjs = require("snarkjs");
const fs = require("fs");
const circomlibjs = require("circomlibjs");

async function main() {
  const poseidon = await circomlibjs.buildPoseidon();
  const input = 10;

  // 生成证明时仅传递输入信号 'in'
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { in: input }, // 移除了多余的 hash 参数
    "build/poseidon_hasher_js/poseidon_hasher.wasm",
    "circuit_0000.zkey"
  );

  console.log("Public Signals (hash):", publicSignals);
  console.log("Proof:", JSON.stringify(proof, null, 2));

  const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

  console.log("Verification Result:", res ? "OK" : "FAIL");
}

main().catch(console.error);
