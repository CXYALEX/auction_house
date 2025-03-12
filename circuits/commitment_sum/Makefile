test: compile prove verify

compile: remove prepare build witness ptau setup verification_key solidity

remove:
	rm -rf ./generated

prepare:
	echo "Creating dir" && \
    mkdir -p generated

build:
	echo "Compiling scheme" && \
	circom ./commitment_sum.circom --r1cs --wasm --sym -o=./generated && \
    echo "INFO:" && \
    snarkjs r1cs info ./generated/commitment_sum.r1cs


witness:
	echo "Generating witness" && \
    node ./generated/commitment_sum_js/generate_witness.js ./generated/commitment_sum_js/commitment_sum.wasm ./input.json ./generated/commitment_sum_js/witness.wtns


ptau:
	echo "Generating powers of tau: phase #1" && \
	snarkjs powersoftau new bn128 14 ./generated/commitment_sum_js/ptau_000.ptau && \
	snarkjs powersoftau contribute ./generated/commitment_sum_js/ptau_000.ptau ./generated/commitment_sum_js/ptau.ptau --name="First contribution"
	echo "Generating powers of tau: phase #2" && \
	snarkjs powersoftau prepare phase2 ./generated/commitment_sum_js/ptau.ptau ./generated/commitment_sum_js/final.ptau


setup:
	echo "Setup groth16" && \
    snarkjs groth16 setup ./generated/commitment_sum.r1cs ./generated/commitment_sum_js/final.ptau ./generated/commitment_sum_js/commitment_sum_000.zkey && \
    snarkjs zkey contribute ./generated/commitment_sum_js/commitment_sum_000.zkey ./generated/commitment_sum_js/commitment_sum.zkey --name="First contribution"

verification_key:
	echo "Exporting verification key" && \
    snarkjs zkey export verificationkey ./generated/commitment_sum_js/commitment_sum.zkey ./generated/commitment_sum_js/verification_key.json

prove:
	echo "Prooving" && \
    snarkjs groth16 prove ./generated/commitment_sum_js/commitment_sum.zkey ./generated/commitment_sum_js/witness.wtns ./generated/proof.json ./generated/public.json

verify:
	echo "Verifing" && \
    snarkjs groth16 verify ./generated/commitment_sum_js/verification_key.json ./generated/public.json ./generated/proof.json

solidity:
	echo "Generating .sol" && \
    snarkjs zkey export solidityverifier ./generated/commitment_sum_js/commitment_sum.zkey verifier.sol