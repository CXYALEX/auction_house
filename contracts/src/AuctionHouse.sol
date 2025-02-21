// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./MerkleProof.sol";
import "./DepositVerifier.sol";
import "./IVerifier.sol";

// import "./BN254.sol";
// import "./Pedersen.sol";
// import "./BulletproofsVerifier.sol";

contract PrivacyAuctionHouse {
    using MerkleProof for bytes32[];

    // 全局状态树结构
    struct GlobalState {
        bytes32 commitmentsRoot;
        bytes32 R1Root;
        bytes32 R2Root;
    }

    // 用户账户结构（ETH余额跟踪）
    struct Account {
        bytes32[] commitments;
        bytes32 stateRoot;
        mapping(bytes32 => uint256) commitmentBalances; // 承诺对应ETH金额
    }

    // 拍卖参数结构（使用ETH）
    struct AuctionParams {
        uint256 minBid;
        uint256 bidDuration;
        uint256 revealDuration;
        address tokenContract;
        uint256 tokenId;
    }

    IVerifier public depositVerifier;   // 存款验证器

    // 系统参数
    GlobalState public globalState;
    mapping(address => Account) public accounts;
    mapping(uint256 => AuctionParams) public auctions;
    
    // 事件定义（使用ETH）
    event Deposit(address indexed user, bytes32 commitment, uint256 amount);
    event PaymentProcessed(address indexed sender, uint256 totalAmount);
    event Withdrawal(address indexed user, uint256 amount);
    event BidSubmitted(uint256 indexed auctionId, address indexed bidder);

    // 接收ETH的fallback函数
    receive() external payable {}

    function deposit(
        bytes32 commitment,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external payable {
        // 验证公开信号包含金额和承诺
        require(_pubSignals[0] == msg.value, "Amount mismatch");
        require(_pubSignals[1] == uint256(commitment), "Commitment mismatch");

        // 验证零知识证明
        require(depositVerifier.verifyProof(_pA, _pB, _pC, _pubSignals), 
            "Invalid deposit proof");

        // 后续存款逻辑...
        accounts[msg.sender].commitments.push(commitment);
        accounts[msg.sender].commitmentBalances[commitment] = msg.value;
        emit Deposit(msg.sender, commitment, msg.value);
    }
    // // 支付功能（ETH转账）
    // function processPayment(
    //     bytes32[] memory inputCommits,
    //     bytes32[] memory outputCommits,
    //     uint256 totalAmount,
    //     bytes32[] memory merkleProofs,
    //     bytes calldata zkProof
    // ) external {
    //     // 验证零知识证明
    //     require(paymentVerifier.verifyProof(
    //         [inputCommits.length, outputCommits.length, totalAmount],
    //         zkProof
    //     ), "Invalid payment proof");

    //     // 验证输入承诺
    //     uint256 inputTotal;
    //     for (uint i = 0; i < inputCommits.length; i++) {
    //         require(_verifyMembership(inputCommits[i], merkleProofs[i]),
    //             "Invalid commitment");
    //         inputTotal += accounts[msg.sender].commitmentBalances[inputCommits[i]];
    //     }
    //     require(inputTotal >= totalAmount, "Insufficient balance");

    //     // 执行ETH转账
    //     (bool sent, ) = msg.sender.call{value: totalAmount}("");
    //     require(sent, "ETH transfer failed");

    //     _updateStateTrees(inputCommits, outputCommits);
    //     emit PaymentProcessed(msg.sender, totalAmount);
    // }

    // // 投标功能（锁定ETH）
    // function submitBid(
    //     uint256 auctionId,
    //     bytes32 bidCommit,
    //     bytes32[] memory merkleProof,
    //     bytes calldata zkProof
    // ) external payable {
    //     AuctionParams memory auction = auctions[auctionId];
    //     require(block.timestamp < auction.bidDuration, "Bidding closed");

    //     // 验证投标金额（来自msg.value）
    //     require(msg.value >= auction.minBid, "Bid too low");
    //     require(bidVerifier.verifyProof(
    //         [uint256(bidCommit), msg.value],
    //         zkProof
    //     ), "Invalid bid proof");

    //     // ETH已通过msg.value锁定在合约中
    //     _setTempFlag(bidCommit, merkleProof);
    //     emit BidSubmitted(auctionId, msg.sender);
    // }

    // // 提现功能（ETH转账）
    // function withdraw(
    //     bytes32[] memory inputCommits,
    //     uint256 amount,
    //     bytes32[] memory merkleProofs,
    //     bytes calldata zkProof
    // ) external {
    //     require(paymentVerifier.verifyProof(
    //         [inputCommits.length, amount],
    //         zkProof
    //     ), "Invalid withdrawal proof");

    //     uint256 verifiedBalance;
    //     for (uint i = 0; i < inputCommits.length; i++) {
    //         require(_checkFlag(inputCommits[i], merkleProofs[i]) == 0,
    //             "Commitment spent");
    //         verifiedBalance += accounts[msg.sender].commitmentBalances[inputCommits[i]];
    //     }
    //     require(verifiedBalance >= amount, "Insufficient funds");

    //     // 更新账户余额
    //     for (uint i = 0; i < inputCommits.length; i++) {
    //         accounts[msg.sender].commitmentBalances[inputCommits[i]] -= amount;
    //     }

    //     (bool sent, ) = msg.sender.call{value: amount}("");
    //     require(sent, "ETH transfer failed");
    //     emit Withdrawal(msg.sender, amount);
    // }

    // 辅助函数
    // ======================================================
    
    // Merkle树验证
    function _verifyMembership(
        bytes32 leaf,
        bytes32[] memory proof
    ) internal view returns (bool) {
        return proof.verify(globalState.commitmentsRoot, leaf);
    }

    // 状态树更新（保持不变）
    function _updateStateTrees(
        bytes32[] memory inputs,
        bytes32[] memory outputs
    ) internal {
        for (uint i = 0; i < inputs.length; i++) {
            _setPermFlag(inputs[i]);
        }
        for (uint j = 0; j < outputs.length; j++) {
            _addCommitment(outputs[j]);
        }
    }

    // Merkle树更新逻辑（示例实现）
    function _updateMerkleTree(bytes32 commitment) internal pure returns (bytes32[] memory) {
        // 实现具体的Merkle树更新逻辑
        bytes32[] memory path = new bytes32[](1);
        path[0] = commitment;
        return path;
    }

    // 标记位操作（示例实现）
    function _setPermFlag(bytes32 commitment) internal pure {
        // 实现永久标记位设置
    }

    function _setTempFlag(bytes32 commitment, bytes32[] memory proof) internal pure {
        // 实现临时标记位设置
    }

    function _checkFlag(bytes32 commitment, bytes32[] memory proof) internal pure returns (uint256) {
        // 实现标记位检查
        return 0;
    }

    function _addCommitment(bytes32 commitment) internal {
        // 添加新承诺到账户
        accounts[msg.sender].commitments.push(commitment);
    }
}
