test: compile prove verify

compile: remove prepare build witness ptau setup verification_key solidity

remove:
	rm -rf ./generated

prepare:
	echo "Creating dir" && \
    mkdir -p generated

build:
	echo "Compiling scheme" && \
	circom ./tree.circom --r1cs --wasm --sym -o=./generated && \
    echo "INFO:" && \
    snarkjs r1cs info ./generated/tree.r1cs


witness:
	echo "Generating witness" && \
    node ./generated/tree_js/generate_witness.js ./generated/tree_js/tree.wasm ./input.json ./generated/tree_js/witness.wtns


ptau:
	echo "Generating powers of tau: phase #1" && \
	snarkjs powersoftau new bn128 14 ./generated/tree_js/ptau_000.ptau && \
	snarkjs powersoftau contribute ./generated/tree_js/ptau_000.ptau ./generated/tree_js/ptau.ptau --name="First contribution"
	echo "Generating powers of tau: phase #2" && \
	snarkjs powersoftau prepare phase2 ./generated/tree_js/ptau.ptau ./generated/tree_js/final.ptau


setup:
	echo "Setup groth16" && \
    snarkjs groth16 setup ./generated/tree.r1cs ./generated/tree_js/final.ptau ./generated/tree_js/tree_000.zkey && \
    snarkjs zkey contribute ./generated/tree_js/tree_000.zkey ./generated/tree_js/tree.zkey --name="First contribution"

verification_key:
	echo "Exporting verification key" && \
    snarkjs zkey export verificationkey ./generated/tree_js/tree.zkey ./generated/tree_js/verification_key.json

prove:
	echo "Prooving" && \
    snarkjs groth16 prove ./generated/tree_js/tree.zkey ./generated/tree_js/witness.wtns ./generated/proof.json ./generated/public.json

verify:
	echo "Verifing" && \
    snarkjs groth16 verify ./generated/tree_js/verification_key.json ./generated/public.json ./generated/proof.json

solidity:
	echo "Generating .sol" && \
    snarkjs zkey export solidityverifier ./generated/tree_js/tree.zkey verifier.sol