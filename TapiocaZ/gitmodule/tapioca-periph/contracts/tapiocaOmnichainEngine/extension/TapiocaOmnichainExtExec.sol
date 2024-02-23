// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {
    ERC20PermitApprovalMsg,
    ERC721PermitApprovalMsg,
    YieldBoxApproveAllMsg,
    MarketPermitActionMsg,
    YieldBoxApproveAssetMsg
} from "tapioca-periph/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {IPermitBorrow} from "tapioca-periph/interfaces/common/IPermitBorrow.sol";
import {TapiocaOmnichainEngineCodec} from "../TapiocaOmnichainEngineCodec.sol";
import {IPermitAll} from "tapioca-periph/interfaces/common/IPermitAll.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IPermit} from "tapioca-periph/interfaces/common/IPermit.sol";
import {ERC721Permit} from "tapioca-periph/utils/ERC721Permit.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title TapiocaOmnichainExtExec
 * @author TapiocaDAO
 * @notice Used to execute external calls from a TapiocaOmnichainEngine contract. So to not use TapiocaOmnichainEngine in the call context.
 */
contract TapiocaOmnichainExtExec is Ownable {
    ICluster public cluster;

    error InvalidApprovalTarget(address _target);

    constructor(ICluster _cluster, address _owner) {
        cluster = _cluster;
        _transferOwnership(_owner);
    }

    /**
     * @notice Executes an ERC20 permit approval.
     * @param _data The ERC20 permit approval messages. Expect an `ERC20PermitApprovalMsg[]`.
     */
    function erc20PermitApproval(bytes memory _data) public {
        ERC20PermitApprovalMsg[] memory approvals = TapiocaOmnichainEngineCodec.decodeERC20PermitApprovalMsg(_data);

        uint256 approvalsLength = approvals.length;
        for (uint256 i = 0; i < approvalsLength;) {
            IERC20Permit(approvals[i].token).permit(
                approvals[i].owner,
                approvals[i].spender,
                approvals[i].value,
                approvals[i].deadline,
                approvals[i].v,
                approvals[i].r,
                approvals[i].s
            );
            unchecked {
                ++i;
            }
        }
    }
    /**
     * @notice Executes an ERC721 permit approval.
     * @param _data The ERC721 permit approval messages. Expect an `ERC721PermitApprovalMsg[]`.
     */

    function erc721PermitApproval(bytes memory _data) public {
        // TODO: encode and decode packed data to save gas
        ERC721PermitApprovalMsg[] memory approvals = TapiocaOmnichainEngineCodec.decodeERC721PermitApprovalMsg(_data);

        uint256 approvalsLength = approvals.length;
        for (uint256 i = 0; i < approvalsLength;) {
            ERC721Permit(approvals[i].token).permit(
                approvals[i].spender,
                approvals[i].tokenId,
                approvals[i].deadline,
                approvals[i].v,
                approvals[i].r,
                approvals[i].s
            );
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Executes a permit approval for a batch transfer from a Pearlmit contract.
     * @param _data The call data containing info about the approval. Expect a tuple of `(address, IPearlmit.PermitBatchTransferFrom)`.
     */
    function pearlmitApproval(bytes memory _data) public {
        (address pearlmit, IPearlmit.PermitBatchTransferFrom memory batchApprovals) =
            TapiocaOmnichainEngineCodec.decodePearlmitBatchApprovalMsg(_data);

        IPearlmit(pearlmit).permitBatchApprove(batchApprovals);
    }

    /**
     * @notice Approves YieldBox asset via permit.
     * @param _data The call data containing info about the approvals.
     *      - token::address: Address of the YieldBox to approve.
     *      - owner::address: Address of the owner of the tokens.
     *      - spender::address: Address of the spender.
     *      - value::uint256: Amount of tokens to approve.
     *      - deadline::uint256: Deadline for the approval.
     *      - v::uint8: v value of the signature.
     *      - r::bytes32: r value of the signature.
     *      - s::bytes32: s value of the signature.
     */
    function yieldBoxPermitAsset(bytes memory _data) public {
        YieldBoxApproveAssetMsg[] memory approvals =
            TapiocaOmnichainEngineCodec.decodeArrayOfYieldBoxPermitAssetMsg(_data);

        uint256 approvalsLength = approvals.length;
        for (uint256 i = 0; i < approvalsLength;) {
            _sanitizeTarget(approvals[i].target);
            unchecked {
                ++i;
            }
        }

        _yieldBoxPermitApproveAsset(approvals);
    }

    /**
     * @notice Approves all assets on YieldBox.
     * @param _data The call data containing info about the approval.
     *      - target::address: Address of the YieldBox contract.
     *      - owner::address: Address of the owner of the tokens.
     *      - spender::address: Address of the spender.
     *      - deadline::uint256: Deadline for the approval.
     *      - v::uint8: v value of the signature.
     *      - r::bytes32: r value of the signature.
     *      - s::bytes32: s value of the signature.
     */
    function yieldBoxPermitAll(bytes memory _data) public {
        YieldBoxApproveAllMsg memory approval = TapiocaOmnichainEngineCodec.decodeYieldBoxApproveAllMsg(_data);
        _sanitizeTarget(approval.target);

        if (approval.permit) {
            _yieldBoxPermitApproveAll(approval);
        } else {
            _yieldBoxPermitRevokeAll(approval);
        }
    }

    /**
     * @notice Approves Market lend/borrow via permit.
     * @param _data The call data containing info about the approval.
     *      - token::address: Address of the YieldBox to approve.
     *      - owner::address: Address of the owner of the tokens.
     *      - spender::address: Address of the spender.
     *      - value::uint256: Amount of tokens to approve.
     *      - deadline::uint256: Deadline for the approval.
     *      - v::uint8: v value of the signature.
     *      - r::bytes32: r value of the signature.
     *      - s::bytes32: s value of the signature.
     */
    function marketPermit(bytes memory _data) public {
        MarketPermitActionMsg memory approval = TapiocaOmnichainEngineCodec.decodeMarketPermitApprovalMsg(_data);
        _sanitizeTarget(approval.target);

        if (approval.permitAsset) {
            _marketPermitAssetApproval(approval);
        } else {
            _marketPermitCollateralApproval(approval);
        }
    }

    // ********************** //
    // ****** INTERNAL ****** //
    // ********************** //

    /**
     * @notice Executes YieldBox setApprovalForAsset(true) operations.
     * @dev similar to IERC20Permit
     * @param _approvals The approvals message.
     */
    function _yieldBoxPermitApproveAsset(YieldBoxApproveAssetMsg[] memory _approvals) internal {
        uint256 approvalsLength = _approvals.length;
        for (uint256 i = 0; i < approvalsLength;) {
            // @dev token is YieldBox
            if (!_approvals[i].permit) {
                IPermit(_approvals[i].target).revoke(
                    _approvals[i].owner,
                    _approvals[i].spender,
                    _approvals[i].assetId,
                    _approvals[i].deadline,
                    _approvals[i].v,
                    _approvals[i].r,
                    _approvals[i].s
                );
            } else {
                IPermit(_approvals[i].target).permit(
                    _approvals[i].owner,
                    _approvals[i].spender,
                    _approvals[i].assetId,
                    _approvals[i].deadline,
                    _approvals[i].v,
                    _approvals[i].r,
                    _approvals[i].s
                );
            }
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Executes YieldBox setApprovalForAll(true) operation.
     * @param _approval The approval message.
     */
    function _yieldBoxPermitApproveAll(YieldBoxApproveAllMsg memory _approval) internal {
        IPermitAll(_approval.target).permitAll(
            _approval.owner, _approval.spender, _approval.deadline, _approval.v, _approval.r, _approval.s
        );
    }

    /**
     * @notice Executes YieldBox setApprovalForAll(false) operation.
     * @param _approval The approval message.
     */
    function _yieldBoxPermitRevokeAll(YieldBoxApproveAllMsg memory _approval) internal {
        IPermitAll(_approval.target).revokeAll(
            _approval.owner, _approval.spender, _approval.deadline, _approval.v, _approval.r, _approval.s
        );
    }

    /**
     * @notice Executes SGL/BB permitLend operation.
     * @param _approval The approval message.
     */
    function _marketPermitAssetApproval(MarketPermitActionMsg memory _approval) internal {
        IPermit(_approval.target).permit(
            _approval.owner,
            _approval.spender,
            _approval.value,
            _approval.deadline,
            _approval.v,
            _approval.r,
            _approval.s
        );
    }

    /**
     * @notice Executes SGL/BB permitBorrow operation.
     * @param _approval The approval message.
     */
    function _marketPermitCollateralApproval(MarketPermitActionMsg memory _approval) internal {
        IPermitBorrow(_approval.target).permitBorrow(
            _approval.owner,
            _approval.spender,
            _approval.value,
            _approval.deadline,
            _approval.v,
            _approval.r,
            _approval.s
        );
    }

    function _sanitizeTarget(address target) private view {
        if (!cluster.isWhitelisted(0, target)) {
            revert InvalidApprovalTarget(target);
        }
    }
}
