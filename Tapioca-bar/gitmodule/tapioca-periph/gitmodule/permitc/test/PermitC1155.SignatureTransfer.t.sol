// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "forge-std/Test.sol";
import "../src/PermitC.sol";
import "../src/libraries/PermitHash.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./mocks/ERC1155Mock.sol";

contract PermitC1155Test is Test {
    struct ApprovalTransferDetails {
        // Address to transfer the tokens to
        address to;
        // Amount of tokens to transfer
        uint256 requestedAmount;
    }
    
    struct PermitSignatureDetails {
        // Collection Address
        address token;
        // Token ID
        uint256 id;
        // An random value that can be used to invalidate the permit
        uint256 nonce;
        // Address permitted to transfer the tokens
        address operator;
        // Amount of tokens - For ERC721 this is always 1
        uint200 amount;
        // Expiration time of the permit
        uint48 expiration;
    }

    PermitC permitC;

    uint256 aliceKey;
    uint256 bobKey;
    uint256 carolKey;

    address alice;
    address bob;
    address carol;

    function setUp() public {
        permitC = new PermitC("PermitC", "1");

        aliceKey = 1;
        bobKey = 2;
        carolKey = 3;

        alice = vm.addr(aliceKey);
        bob = vm.addr(bobKey);
        carol = vm.addr(carolKey);
    }

    function testPermitSignatureDetails_ERC1155() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 1,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration,
                    0
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 1);
    }

    function testPermitSignatureDetails_ERC1155_MoreThanOne() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 10);

        assertEq(ERC1155(token).balanceOf(alice, 1), 10);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 2,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration,
                    0
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 2, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 2);
        assertEq(ERC1155(token).balanceOf(alice, 1), 8);
    }

    function testPermitSignatureDetails_ERC1155_RequestedAmountTooHigh() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 1,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        vm.expectRevert(PermitC__SignatureTransferExceededPermittedAmount.selector);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 2, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 0);
        assertEq(ERC1155(token).balanceOf(alice, 1), 1);
    }

    function testPermitSignatureDetails_ERC1155_ExpiredPermit() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit =
            PermitSignatureDetails({token: token, id: 1, amount: 1, nonce: 0, operator: bob, expiration: uint48(block.timestamp)});

        vm.warp(uint48(block.timestamp + 1000));

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        vm.expectRevert(PermitC__SignatureTransferExceededPermitExpired.selector);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 0);
        assertEq(ERC1155(token).balanceOf(alice, 1), 1);
    }

    function testPermitSignatureDetails_ERC1155_WrongOwnerSignature() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 1,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(carolKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 0);
        assertEq(ERC1155(token).balanceOf(alice, 1), 1);
    }

    function testPermitSignatureDetails_ERC1155_UsedNonce() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 1,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration,
                    0
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.startPrank(bob);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(bob, 1), 1);
        assertEq(ERC1155(token).balanceOf(alice, 1), 0);

        vm.prank(bob);
        ERC1155(token).safeTransferFrom(bob, alice, 1, 1, "");

        assertEq(ERC1155(token).balanceOf(bob, 1), 0);
        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.startPrank(bob);
        vm.expectRevert(PermitC__NonceAlreadyUsedOrRevoked.selector);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();
    }

    function testPermitSignatureDetails_ERC1155_AfterInvalidatedNonce() public {
        address token = _deployNew1155(carol, 1, 0);

        _mint1155(token, alice, 1, 1);

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);

        vm.prank(alice);
        ERC1155(token).setApprovalForAll(address(permitC), true);

        PermitSignatureDetails memory permit = PermitSignatureDetails({
            token: token,
            id: 1,
            amount: 1,
            nonce: 0,
            operator: bob,
            expiration: uint48(block.timestamp + 1000)
        });

        bytes32 digest = ECDSA.toTypedDataHash(
            permitC.domainSeparatorV4(),
            keccak256(
                abi.encode(
                    SINGLE_USE_PERMIT_TYPEHASH,
                    permit.token,
                    permit.id,
                    permit.amount,
                    permit.nonce,
                    permit.operator,
                    permit.expiration,
                    0
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aliceKey, digest);
        bytes memory signedPermit = abi.encodePacked(r, s, v);

        vm.prank(alice);
        permitC.invalidateUnorderedNonce(0);

        vm.startPrank(bob);
        vm.expectRevert(PermitC__NonceAlreadyUsedOrRevoked.selector);
        permitC.permitTransferFromERC1155(permit.token, permit.id, permit.nonce, permit.amount, permit.expiration, alice, bob, 1, signedPermit);
        vm.stopPrank();

        assertEq(ERC1155(token).balanceOf(alice, 1), 1);
    }

    function _deployNew1155(address creator, uint256 idToMint, uint256 amountToMint)
        internal
        virtual
        returns (address)
    {
        vm.startPrank(creator);
        address token = address(new ERC1155Mock());
        ERC1155Mock(token).mint(creator, idToMint, amountToMint);
        vm.stopPrank();
        return token;
    }

    function _mint1155(address tokenAddress, address to, uint256 tokenId, uint256 amount) internal virtual {
        ERC1155Mock(tokenAddress).mint(to, tokenId, amount);
    }
}
