// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Tapioca
import {
    MintFromBBAndLendOnSGLData,
    CrossChainMintFromBBAndLendOnSGLData,
    IMintData,
    IDepositData,
    IOptionsLockData,
    IOptionsParticipateData,
    DepositAndSendForLockingData,
    LockAndParticipateData,
    MagnetarWithdrawData
} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {ITapiocaOptionLiquidityProvision} from
    "tapioca-periph/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {ITapiocaOptionBroker} from "tapioca-periph/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {IMarketHelper} from "tapioca-periph/interfaces/bar/IMarketHelper.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IMarket, Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {SafeApprove} from "tapioca-periph/libraries/SafeApprove.sol";
import {ITOFT} from "tapioca-periph/interfaces/oft/ITOFT.sol";
import {MagnetarBaseModule} from "./MagnetarBaseModule.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title MagnetarMintCommonModule
 * @author TapiocaDAO
 */
abstract contract MagnetarMintCommonModule is MagnetarBaseModule {
    using SafeApprove for address;
    using SafeERC20 for IERC20;

    error Magnetar_ActionParamsMismatch();
    error Magnetar_tOLPTokenMismatch();

    /// Internal
    /// =====================
    function _wrapSglReceipt(IYieldBox yieldBox, address sgl, address user, uint256 fraction, uint256 assetId)
        internal
        returns (uint256 toftAmount)
    {
        IERC20(sgl).safeTransferFrom(user, address(this), fraction);

        (, address tReceiptAddress,,) = yieldBox.assets(assetId);

        IERC20(sgl).approve(tReceiptAddress, fraction);
        toftAmount = ITOFT(tReceiptAddress).wrap(address(this), address(this), fraction);
        IERC20(tReceiptAddress).safeTransfer(user, toftAmount);
    }

    function _participateOnTOLP(
        IOptionsParticipateData memory participateData,
        address user,
        address lockDataTarget,
        uint256 tOLPTokenId
    ) internal {
        if (!cluster.isWhitelisted(0, participateData.target)) {
            revert Magnetar_TargetNotWhitelisted(participateData.target);
        }

        // Check tOLPTokenId
        if (participateData.tOLPTokenId != 0) {
            if (participateData.tOLPTokenId != tOLPTokenId && tOLPTokenId != 0) {
                revert Magnetar_tOLPTokenMismatch();
            }

            tOLPTokenId = participateData.tOLPTokenId;
        }
        if (tOLPTokenId == 0) revert Magnetar_ActionParamsMismatch();

        IERC721(lockDataTarget).approve(participateData.target, tOLPTokenId);
        uint256 oTAPTokenId = ITapiocaOptionBroker(participateData.target).participate(tOLPTokenId);

        address oTapAddress = ITapiocaOptionBroker(participateData.target).oTAP();
        IERC721(oTapAddress).safeTransferFrom(address(this), user, oTAPTokenId, "0x");
    }

    function _lockOnTOB(
        IOptionsLockData memory lockData,
        IYieldBox yieldBox_,
        uint256 fraction,
        bool participate,
        address user,
        address singularityAddress
    ) internal returns (uint256 tOLPTokenId) {
        tOLPTokenId = 0;
        if (lockData.lock) {
            if (!cluster.isWhitelisted(0, lockData.target)) {
                revert Magnetar_TargetNotWhitelisted(lockData.target);
            }
            if (lockData.fraction > 0) fraction = lockData.fraction;

            // retrieve and deposit SGLAssetId registered in tOLP
            (uint256 tOLPSglAssetId,,) =
                ITapiocaOptionLiquidityProvision(lockData.target).activeSingularities(singularityAddress);
            if (fraction == 0) revert Magnetar_ActionParamsMismatch();

            //deposit to YieldBox
            _extractTokens(user, singularityAddress, fraction);
            yieldBox_.depositAsset(tOLPSglAssetId, address(this), address(this), fraction, 0);

            _setApprovalForYieldBox(lockData.target, yieldBox_);
            tOLPTokenId = ITapiocaOptionLiquidityProvision(lockData.target).lock(
                participate ? address(this) : user, singularityAddress, lockData.lockDuration, lockData.amount
            );
            _revertYieldBoxApproval(lockData.target, yieldBox_);
        }
    }

    function _depositYBLendSGL(
        IDepositData memory depositData,
        address singularityAddress,
        IYieldBox yieldBox_,
        address user,
        uint256 lendAmount
    ) internal returns (uint256 fraction) {
        if (singularityAddress != address(0)) {
            if (!cluster.isWhitelisted(0, singularityAddress)) {
                revert Magnetar_TargetNotWhitelisted(singularityAddress);
            }
            _setApprovalForYieldBox(singularityAddress, yieldBox_);

            IMarket singularity_ = IMarket(singularityAddress);

            // if `depositData.deposit`:
            //      - deposit SGL asset to YB for `user`
            uint256 sglAssetId = singularity_.assetId();
            (, address sglAssetAddress,,) = yieldBox_.assets(sglAssetId);
            if (depositData.deposit) {
                depositData.amount = _extractTokens(user, sglAssetAddress, depositData.amount);

                sglAssetAddress.safeApprove(address(yieldBox_), depositData.amount);
                yieldBox_.depositAsset(sglAssetId, address(this), user, depositData.amount, 0);
            }

            // if `lendAmount` > 0:
            //      - add asset to SGL
            fraction = 0;
            if (lendAmount == 0 && depositData.deposit) {
                lendAmount = depositData.amount;
            }
            if (lendAmount > 0) {
                uint256 lendShare = yieldBox_.toShare(sglAssetId, lendAmount, false);
                fraction = ISingularity(singularityAddress).addAsset(user, user, false, lendShare);
            }

            _revertYieldBoxApproval(singularityAddress, yieldBox_);
        }
    }

    function _depositYBBorrowBB(
        IMintData memory mintData,
        address bigBangAddress,
        IYieldBox yieldBox_,
        address user,
        address marketHelper
    ) internal {
        if (bigBangAddress != address(0)) {
            if (!cluster.isWhitelisted(0, bigBangAddress)) {
                revert Magnetar_TargetNotWhitelisted(bigBangAddress);
            }

            if (!cluster.isWhitelisted(0, marketHelper)) {
                revert Magnetar_TargetNotWhitelisted(marketHelper);
            }

            _setApprovalForYieldBox(bigBangAddress, yieldBox_);

            IMarket bigBang_ = IMarket(bigBangAddress);

            // retrieve collateral id & address
            uint256 bbCollateralId = bigBang_.collateralId();
            (, address bbCollateralAddress,,) = yieldBox_.assets(bbCollateralId);

            // compute collateral share
            uint256 bbCollateralShare = yieldBox_.toShare(bbCollateralId, mintData.collateralDepositData.amount, false);

            // deposit collateral to YB
            if (mintData.collateralDepositData.deposit) {
                mintData.collateralDepositData.amount =
                    _extractTokens(user, bbCollateralAddress, mintData.collateralDepositData.amount);
                bbCollateralShare = yieldBox_.toShare(bbCollateralId, mintData.collateralDepositData.amount, false);

                bbCollateralAddress.safeApprove(address(yieldBox_), mintData.collateralDepositData.amount);
                yieldBox_.depositAsset(
                    bbCollateralId, address(this), address(this), mintData.collateralDepositData.amount, 0
                );
            }

            // add collateral to BB
            if (mintData.collateralDepositData.amount > 0) {
                _setApprovalForYieldBox(address(bigBang_), yieldBox_);

                (Module[] memory modules, bytes[] memory calls) = IMarketHelper(marketHelper).addCollateral(
                    mintData.collateralDepositData.deposit ? address(this) : user,
                    user,
                    false,
                    mintData.collateralDepositData.amount,
                    bbCollateralShare
                );
                bigBang_.execute(modules, calls, true);
            }

            // mints from BB
            {
                (Module[] memory modules, bytes[] memory calls) =
                    IMarketHelper(marketHelper).borrow(user, user, mintData.mintAmount);
                bigBang_.execute(modules, calls, true);
            }

            _revertYieldBoxApproval(bigBangAddress, yieldBox_);
        }
    }
}
