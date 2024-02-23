// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import {OrderFillAmounts} from "../DataTypes.sol";

interface IPermitC {

    /**
     * =================================================
     * ==================== Events =====================
     * =================================================
     */

    event Approval(
        address indexed owner,
        address indexed token,
        address indexed operator,
        uint256 id,
        uint200 amount,
        uint48 expiration
    );

    event Lockdown(address indexed owner);

    event OrderOpened(
        bytes32 indexed orderId,
        address indexed owner,
        address indexed operator,
        uint200 fillableQuantity
    );

    event OrderFilled(
        bytes32 indexed orderId,
        address indexed owner,
        address indexed operator,
        uint200 amount
    );

    event OrderClosed(
        bytes32 indexed orderId, 
        address indexed owner, 
        address indexed operator, 
        bool wasCancellation);

    /**
     * =================================================
     * ============== Approval Transfers ===============
     * =================================================
     */
    function approve(address token, uint256 id, address operator, uint200 amount, uint48 expiration) external;

    function updateApprovalBySignature(
        address token,
        uint256 id,
        uint256 nonce,
        uint200 amount,
        address operator,
        uint48 approvalExpiration,
        uint48 sigDeadline,
        address owner,
        bytes calldata signedPermit
    ) external;

    function allowance(
        address owner, 
        address operator, 
        address token, 
        uint256 id
    ) external view returns (uint256 amount, uint256 expiration);

    /**
     * =================================================
     * ================ Signed Transfers ===============
     * =================================================
     */
    function registerAdditionalDataHash(string memory additionalDataTypeString) external;

    function permitTransferFromERC721(
        address token,
        uint256 id,
        uint256 nonce,
        uint256 expiration,
        address owner,
        address to,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function permitTransferFromWithAdditionalDataERC721(
        address token,
        uint256 id,
        uint256 nonce,
        uint256 expiration,
        address owner,
        address to,
        bytes32 additionalData,
        bytes32 advancedPermitHash,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function permitTransferFromERC1155(
        address token,
        uint256 id,
        uint256 nonce,
        uint256 permitAmount,
        uint256 expiration,
        address owner,
        address to,
        uint256 transferAmount,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function permitTransferFromWithAdditionalDataERC1155(
        address token,
        uint256 id,
        uint256 nonce,
        uint256 permitAmount,
        uint256 expiration,
        address owner,
        address to,
        uint256 transferAmount,
        bytes32 additionalData,
        bytes32 advancedPermitHash,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function permitTransferFromERC20(
        address token,
        uint256 nonce,
        uint256 permitAmount,
        uint256 expiration,
        address owner,
        address to,
        uint256 transferAmount,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function permitTransferFromWithAdditionalDataERC20(
        address token,
        uint256 nonce,
        uint256 permitAmount,
        uint256 expiration,
        address owner,
        address to,
        uint256 transferAmount,
        bytes32 additionalData,
        bytes32 advancedPermitHash,
        bytes calldata signedPermit
    ) external returns (bool isError);

    function isRegisteredAdditionalDataHash(bytes32 hash) external view returns (bool isRegistered);

    /**
     * =================================================
     * =============== Order Transfers =================
     * =================================================
     */
    function fillPermittedOrderERC1155(
        bytes calldata signedPermit,
        OrderFillAmounts calldata orderFillAmounts,
        address token,
        uint256 id,
        address owner,
        address to,
        uint256 nonce,
        uint48 expiration,
        bytes32 orderId,
        bytes32 advancedPermitHash
    ) external returns (uint200 quantityFilled, bool isError);

    function fillPermittedOrderERC20(
        bytes calldata signedPermit,
        OrderFillAmounts calldata orderFillAmounts,
        address token,
        address owner,
        address to,
        uint256 nonce,
        uint48 expiration,
        bytes32 orderId,
        bytes32 advancedPermitHash
    ) external returns (uint200 quantityFilled, bool isError);

    function closePermittedOrder(
        address owner,
        address token,
        uint256 id,
        bytes32 orderId
    ) external;

    function allowance(
        address owner, 
        address operator, 
        address token, 
        uint256 id,
        bytes32 orderId
    ) external view returns (uint256 amount, uint256 expiration);


    /**
     * =================================================
     * ================ Nonce Management ===============
     * =================================================
     */
    function invalidateUnorderedNonce(uint256 nonce) external;

    function isValidUnorderedNonce(address owner, uint256 nonce) external view returns (bool isValid);

    function lockdown() external;

    function masterNonce(address owner) external view returns (uint256);

    /**
     * =================================================
     * ============== Transfer Functions ===============
     * =================================================
     */
    function transferFromERC721(
        address from,
        address to,
        address token,
        uint256 id
    ) external returns (bool isError);

    function transferFromERC1155(
        address from,
        address to,
        address token,
        uint256 id,
        uint256 amount
    ) external returns (bool isError);

    function transferFromERC20(
        address from,
        address to,
        address token,
        uint256 amount
    ) external returns (bool isError);

    /**
     * =================================================
     * ============ Signature Verification =============
     * =================================================
     */
    function domainSeparatorV4() external view returns (bytes32);
}
