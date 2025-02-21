// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";

import {Groth16Verifier} from "../src/Verifier.sol";

contract DeployGroth16Verifier is Script {
    function run() external returns (Groth16Verifier) {
        vm.startBroadcast();
        Groth16Verifier action = new Groth16Verifier();
        vm.stopBroadcast();
        return action;
    }
}
