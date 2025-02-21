// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

library MerkleProof {
    /**
     * @dev 验证Merkle证明的有效性
     * @param proof 证明路径数组
     * @param root 当前Merkle根
     * @param leaf 待验证的叶子节点
     */
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            // 根据哈希顺序组合节点
            computedHash = computedHash <= proofElement 
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));
        }
        
        return computedHash == root;
    }

    /**
     * @dev 通过叶节点和证明路径计算Merkle根
     * @param leaf 叶子节点数据
     * @param proof 证明路径数组
     */
    function computeRoot(
        bytes32 leaf,
        bytes32[] memory proof
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            // 动态调整哈希顺序
            computedHash = computedHash <= proofElement 
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));
        }
        
        return computedHash;
    }
}
