// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

import {ILayerZeroEndpoint} from "../../../layerzero/v1/interfaces/ILayerZeroEndpoint.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

// Tapioca

interface IStargateBridge {
    function quoteLayerZeroFee(
        uint16 _chainId,
        uint8 _functionType,
        bytes calldata _toAddress,
        bytes calldata _transferAndCallPayload,
        IStargateRouterBase.lzTxObj memory _lzTxParams
    ) external view returns (uint256, uint256);

    function layerZeroEndpoint() external view returns (ILayerZeroEndpoint);

    function gasLookup(uint16, uint8) external view returns (uint256);
}

interface IStargateRouterBase {
    //for Router
    struct lzTxObj {
        uint256 dstGasForCall;
        uint256 dstNativeAmount;
        bytes dstNativeAddr;
    }

    function swap(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLD,
        uint256 _minAmountLD,
        lzTxObj memory _lzTxParams,
        bytes calldata _to,
        bytes calldata _payload
    ) external payable;
}

interface IStargateRouter is IStargateRouterBase {
    //for RouterETH
    function swapETH(
        uint16 _dstChainId, // _refundAddressdestination Stargate chainId
        address payable, // refund additional messageFee to this address
        bytes calldata _toAddress, // the receiver of the destination ETH
        uint256 _amountLD, // the amount, in Local Decimals, to be swapped
        uint256 _minAmountLD // the minimum amount accepted out on destination
    ) external payable;

    function bridge() external view returns (IStargateBridge); // for StargateRouter contract

    function stargateBridge() external view returns (IStargateBridge); // for StargateComposer contract

    function poolId() external view returns (uint256);

    function stargateRouter() external view returns (address);

    function stargateEthVault() external view returns (address);

    //StargateRouter methods only
    function retryRevert(uint16 _srcChainId, bytes calldata _srcAddress, uint256 _nonce) external payable;

    function instantRedeemLocal(uint16 _srcPoolId, uint256 _amountLP, address _to)
        external
        returns (uint256 amountSD);

    function redeemLocal(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLP,
        bytes calldata _to,
        lzTxObj memory _lzTxParams
    ) external payable;

    function redeemRemote(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLP,
        uint256 _minAmountLD,
        bytes calldata _to,
        lzTxObj memory _lzTxParams
    ) external payable;

    function addLiquidity(uint256 _poolId, uint256 _amountLD, address _to) external;

    function createChainPath(uint256 _poolId, uint16 _dstChainId, uint256 _dstPoolId, uint256 _weight) external;

    function activateChainPath(uint256 _poolId, uint16 _dstChainId, uint256 _dstPoolId) external;

    function setWeightForChainPath(uint256 _poolId, uint16 _dstChainId, uint256 _dstPoolId, uint16 _weight) external;

    struct CreditObj {
        uint256 credits;
        uint256 idealBalance;
    }

    function creditChainPath(uint16 _dstChainId, uint256 _dstPoolId, uint256 _srcPoolId, CreditObj memory _c)
        external;
}
