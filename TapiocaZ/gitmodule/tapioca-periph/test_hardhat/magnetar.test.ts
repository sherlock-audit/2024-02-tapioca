import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { signTypedMessage } from 'eth-sig-util';
import { fromRpcSig } from 'ethereumjs-utils';
import hre, { config, ethers } from 'hardhat';
import { BN, getSGLPermitSignature, register } from './test.utils';

import SingularityArtifact from '@tapioca-sdk/artifacts/tapioca-bar/Singularity.json';
import LZEndpointMockArtifact from '@tapioca-sdk/artifacts/tapioca-mocks/LZEndpointMock.json';
import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';

import {
    SGLBorrow__factory,
    SGLCollateral__factory,
    SGLLeverage__factory,
    SGLLiquidation__factory,
} from '@tapioca-sdk/typechain/Tapioca-bar';
import {
    ERC20WithoutStrategy__factory,
    YieldBox,
} from '@tapioca-sdk/typechain/YieldBox';
import {
    ERC20Mock__factory,
    LZEndpointMock__factory,
    OracleMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
import {
    MagnetarAssetModule,
    MagnetarAssetModule__factory,
    MagnetarCollateralModule,
    MagnetarCollateralModule__factory,
    MagnetarMintModule,
    MagnetarMintModule__factory,
    MagnetarMintXChainModule,
    MagnetarMintXChainModule__factory,
    MagnetarOptionModule,
    MagnetarOptionModule__factory,
    MagnetarYieldBoxModule,
    MagnetarYieldBoxModule__factory,
} from '@typechain/index';
import { YieldBoxDepositDataStruct } from '@typechain/contracts/Magnetar/modules/MagnetarYieldBoxModule';
import { DepositAddCollateralAndBorrowFromMarketDataStruct } from '@typechain/contracts/Magnetar/modules/MagnetarCollateralModule';
import { MintFromBBAndLendOnSGLDataStruct } from '@typechain/contracts/Magnetar/modules/MagnetarMintModule';
import { DepositRepayAndRemoveCollateralFromMarketDataStruct } from '@typechain/contracts/Magnetar/modules/MagnetarAssetModule';
import { ExitPositionAndRemoveCollateralDataStruct } from '@typechain/contracts/Magnetar/modules/MagnetarOptionModule';
import { BigNumber } from 'ethers';
import { ContractFunctionVisibility } from 'hardhat/internal/hardhat-network/stack-traces/model';

const MAX_DEADLINE = 9999999999999;

const symbol = 'MTKN';
const version = '1';

describe('MagnetarV2', () => {
    describe('view', () => {
        it('should test sgl info', async () => {
            const {
                deployer,
                yieldBox,
                usd0,
                penrose,
                __wethUsdcPrice,
                wethUsdcOracle,
                weth,
                wethAssetId,
                mediumRiskMC,
                multiSwapper,
                cluster,
            } = await loadFixture(register);

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            //Deploy & set Singularity
            const _sglLiquidationModule = await (
                await ethers.getContractFactory('SGLLiquidation')
            ).deploy();
            await _sglLiquidationModule.deployed();

            const _sglCollateralModule = await (
                await ethers.getContractFactory('SGLCollateral')
            ).deploy();
            await _sglCollateralModule.deployed();

            const _sglBorrowModule = await (
                await ethers.getContractFactory('SGLBorrow')
            ).deploy();
            await _sglBorrowModule.deployed();

            const _sglLeverageModule = await (
                await ethers.getContractFactory('SGLLeverage')
            ).deploy();
            await _sglLeverageModule.deployed();

            const leverageExecutor = await (
                await ethers.getContractFactory('SimpleLeverageExecutor')
            ).deploy(multiSwapper.address, cluster.address);
            await leverageExecutor.deployed();

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const modulesData = {
                _liquidationModule: _sglLiquidationModule.address,
                _borrowModule: _sglBorrowModule.address,
                _collateralModule: _sglCollateralModule.address,
                _leverageModule: _sglLeverageModule.address,
            };

            const tokensData = {
                _asset: usd0.address,
                _assetId: usdoAssetId,
                _collateral: weth.address,
                _collateralId: wethAssetId,
            };
            const extraData = {
                penrose_: penrose.address,
                _oracle: wethUsdcOracle.address,
                _exchangeRatePrecision: ethers.utils.parseEther('1'),
                _collateralizationRate: 0,
                _liquidationCollateralizationRate: 0,
                _leverageExecutor: leverageExecutor.address,
            };

            const sglData = new ethers.utils.AbiCoder().encode(
                [
                    'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                    'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                    'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
                ],
                [modulesData, tokensData, extraData],
            );

            await penrose.registerSingularity(
                mediumRiskMC.address,
                sglData,
                true,
            );
        });
    });
    describe('withdrawTo()', () => {
        it.only('should test withdrawTo', async () => {
            const {
                deployer,
                yieldBox,
                usd0,
                penrose,
                __wethUsdcPrice,
                wethUsdcOracle,
                weth,
                wethAssetId,
                mediumRiskMC,
                magnetar,
                timeTravel,
                cluster,
                multiSwapper,
                marketHelper,
            } = await loadFixture(register);

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            //Deploy & set Singularity
            const _sglLiquidationModule = await (
                await ethers.getContractFactory('SGLLiquidation')
            ).deploy();
            await _sglLiquidationModule.deployed();

            const _sglCollateral = await (
                await ethers.getContractFactory('SGLCollateral')
            ).deploy();
            await _sglCollateral.deployed();

            const _sglBorrow = await (
                await ethers.getContractFactory('SGLBorrow')
            ).deploy();
            await _sglBorrow.deployed();

            const _sglLeverage = await (
                await ethers.getContractFactory('SGLLeverage')
            ).deploy();
            await _sglLeverage.deployed();
            const leverageExecutor = await (
                await ethers.getContractFactory('SimpleLeverageExecutor')
            ).deploy(multiSwapper.address, cluster.address);
            await leverageExecutor.deployed();

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const modulesData = {
                _liquidationModule: _sglLiquidationModule.address,
                _borrowModule: _sglBorrow.address,
                _collateralModule: _sglCollateral.address,
                _leverageModule: _sglLeverage.address,
            };

            const tokensData = {
                _asset: usd0.address,
                _assetId: usdoAssetId,
                _collateral: weth.address,
                _collateralId: wethAssetId,
            };
            const data = {
                penrose_: penrose.address,
                _oracle: wethUsdcOracle.address,
                _exchangeRatePrecision: ethers.utils.parseEther('1'),
                _collateralizationRate: 0,
                _liquidationCollateralizationRate: 0,
                _leverageExecutor: leverageExecutor.address,
            };

            const sglData = new ethers.utils.AbiCoder().encode(
                [
                    'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                    'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                    'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
                ],
                [modulesData, tokensData, data],
            );

            await penrose.registerSingularity(
                mediumRiskMC.address,
                sglData,
                true,
            );
            const wethUsdoSingularity = await ethers.getContractAt(
                'Singularity',
                await penrose.clonesOf(
                    mediumRiskMC.address,
                    (await penrose.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );
            await cluster.updateContract(0, wethUsdoSingularity.address, true);

            //Deploy & set LiquidationQueue
            await usd0.setMinterStatus(wethUsdoSingularity.address, true);
            await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

            const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(10);
            const usdoShare = await yieldBox.toShare(
                usdoAssetId,
                usdoAmount,
                false,
            );
            await usd0.mint(deployer.address, usdoAmount);

            const depositAssetEncodedData: YieldBoxDepositDataStruct = {
                yieldbox: yieldBox.address,
                assetId: usdoAssetId,
                from: deployer.address,
                to: deployer.address,
                amount: 0,
                share: usdoShare,
            };

            const depositAssetEncoded =
                MagnetarYieldBoxModule__factory.createInterface().encodeFunctionData(
                    'depositAsset',
                    [depositAssetEncodedData],
                );

            const sglLendEncoded =
                wethUsdoSingularity.interface.encodeFunctionData('addAsset', [
                    deployer.address,
                    deployer.address,
                    false,
                    usdoShare,
                ]);

            await usd0.approve(magnetar.address, ethers.constants.MaxUint256);
            await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
            await usd0.approve(
                wethUsdoSingularity.address,
                ethers.constants.MaxUint256,
            );
            await yieldBox.setApprovalForAll(deployer.address, true);
            await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
            await yieldBox.setApprovalForAll(magnetar.address, true);
            await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
            await weth.approve(magnetar.address, ethers.constants.MaxUint256);
            await wethUsdoSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            const calls = [
                {
                    id: await magnetar.MAGNETAR_ACTION_YIELDBOX_MODULE(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: depositAssetEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_MARKET(),
                    target: wethUsdoSingularity.address,
                    value: 0,
                    allowFailure: false,
                    call: sglLendEncoded,
                },
            ];

            await cluster.updateContract(0, yieldBox.address, true);
            await cluster.updateContract(0, wethUsdoSingularity.address, true);

            await magnetar.connect(deployer).burst(calls);

            const ybBalance = await yieldBox.balanceOf(
                deployer.address,
                usdoAssetId,
            );
            expect(ybBalance.eq(0)).to.be.true;

            const sglBalance = await wethUsdoSingularity.balanceOf(
                deployer.address,
            );
            expect(sglBalance.gt(0)).to.be.true;

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            await timeTravel(86401);
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(1);
            await weth.freeMint(wethMintVal);

            await wethUsdoSingularity
                .connect(deployer)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = deployer.address.split('0x');
            const depositAddCollateralAndBorrowFromMarketData: DepositAddCollateralAndBorrowFromMarketDataStruct =
                {
                    market: wethUsdoSingularity.address,
                    marketHelper: marketHelper.address,
                    user: deployer.address,
                    collateralAmount: wethMintVal,
                    borrowAmount: borrowAmount,
                    deposit: true,
                    withdrawParams: {
                        withdraw: false,
                        yieldBox: yieldBox.address,
                        assetId: 0,
                        unwrap: false,
                        lzSendParams: {
                            refundAddress: deployer.address,
                            fee: { lzTokenFee: 0, nativeFee: 0 },
                            extraOptions: '0x',
                            sendParam: {
                                amountLD: 0,
                                composeMsg: '0x',
                                dstEid: 0,
                                extraOptions: '0x',
                                minAmountLD: 0,
                                oftCmd: '0x',
                                to: '0x'.concat(
                                    receiverSplit[1].padStart(64, '0'),
                                ),
                            },
                        },
                        sendGas: 0,
                        composeGas: 0,
                        sendVal: 0,
                        composeVal: 0,
                        composeMsg: '0x',
                        composeMsgType: 0,
                    },
                };

            const borrowFn =
                MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                    'depositAddCollateralAndBorrowFromMarket',
                    [depositAddCollateralAndBorrowFromMarketData],
                );

            let borrowPart = await wethUsdoSingularity.userBorrowPart(
                deployer.address,
            );
            expect(borrowPart.eq(0)).to.be.true;

            await cluster.updateContract(0, magnetar.address, true);

            await magnetar.connect(deployer).burst(
                [
                    {
                        id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                        target: magnetar.address,
                        value: ethers.utils.parseEther('2'),
                        allowFailure: false,
                        call: borrowFn,
                    },
                ],
                {
                    value: ethers.utils.parseEther('2'),
                },
            );

            const collateralBalance =
                await wethUsdoSingularity.userCollateralShare(deployer.address);
            const collateralAmpunt = await yieldBox.toAmount(
                wethAssetId,
                collateralBalance,
                false,
            );
            expect(collateralAmpunt.eq(wethMintVal)).to.be.true;

            const borrowCallData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                borrowAmount,
            );

            await wethUsdoSingularity.execute(
                borrowCallData[0],
                borrowCallData[1],
                true,
            );

            await yieldBox.transfer(
                deployer.address,
                magnetar.address,
                usdoAssetId,
                yieldBox.balanceOf(deployer.address, usdoAssetId),
            );

            borrowPart = await wethUsdoSingularity.userBorrowPart(
                deployer.address,
            );
            expect(borrowPart.gte(borrowAmount)).to.be.true;

            const withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: usdoAssetId,
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_YIELDBOX_MODULE(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarYieldBoxModule__factory.createInterface().encodeFunctionData(
                        'withdrawToChain',
                        [withdrawToChainData],
                    ),
                },
            ]);

            const usdoBalanceOfDeployer = await usd0.balanceOf(
                deployer.address,
            );
            expect(usdoBalanceOfDeployer.eq(borrowAmount)).to.be.true;
        });
    });

    describe('permits', () => {
        it('should test an array of permits', async () => {
            const { deployer, eoa1, magnetar, cluster } = await loadFixture(
                register,
            );

            const name = 'Token One';

            const ERC20Mock = new ERC20Mock__factory(deployer);
            const tokenOne = await ERC20Mock.deploy(
                name,
                symbol,
                0,
                18,
                deployer.address,
            );

            const chainId = await getChainId();
            const value = BN(42).toNumber();
            const nonce = 0;

            const accounts: any = config.networks.hardhat.accounts;
            const index = 0; // first wallet, increment for next wallets
            const deployerWallet = ethers.Wallet.fromMnemonic(
                accounts.mnemonic,
                accounts.path + `/${index}`,
            );
            const data = buildData(
                chainId,
                tokenOne.address,
                await tokenOne.name(),
                deployer.address,
                eoa1.address,
                value,
                nonce,
            );
            const privateKey = Buffer.from(
                deployerWallet.privateKey.substring(2, 66),
                'hex',
            );
            const signature = signTypedMessage(privateKey, { data });
            const { v, r, s } = fromRpcSig(signature);

            const permitEncodedFnData = tokenOne.interface.encodeFunctionData(
                'permit',
                [deployer.address, eoa1.address, value, MAX_DEADLINE, v, r, s],
            );
            await cluster.updateContract(0, tokenOne.address, true);

            await magnetar.connect(deployer).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: tokenOne.address,
                    value: 0,
                    allowFailure: false,
                    call: permitEncodedFnData,
                },
            ]);

            const allowance = await tokenOne.allowance(
                deployer.address,
                eoa1.address,
            );
            expect(allowance.eq(value)).to.be.true;

            await expect(
                magnetar.connect(deployer).burst([
                    {
                        id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                        target: tokenOne.address,
                        value: 0,
                        allowFailure: false,
                        call: permitEncodedFnData,
                    },
                ]),
            ).to.be.reverted;
        });
    });

    describe('ybDeposit()', () => {
        it('should execute YB deposit asset', async () => {
            const {
                deployer,
                yieldBox,
                magnetar,
                createTokenEmptyStrategy,
                cluster,
            } = await loadFixture(register);

            const name = 'Token One';

            const ERC20Mock = new ERC20Mock__factory(deployer);
            const tokenOne = await ERC20Mock.deploy(
                name,
                symbol,
                0,
                18,
                deployer.address,
            );
            await tokenOne.deployed();

            const tokenOneStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                tokenOne.address,
            );

            await yieldBox.registerAsset(
                1,
                tokenOne.address,
                tokenOneStrategy.address,
                0,
            );
            const tokenOneAssetId = await yieldBox.ids(
                1,
                tokenOne.address,
                tokenOneStrategy.address,
                0,
            );

            const chainId = await getChainId();

            const mintVal = 1;
            tokenOne.freeMint(mintVal);

            const mintValShare = await yieldBox.toShare(
                tokenOneAssetId,
                mintVal,
                false,
            );

            const accounts: any = config.networks.hardhat.accounts;
            const deployerWallet = ethers.Wallet.fromMnemonic(
                accounts.mnemonic,
                accounts.path + '/0',
            );

            const privateKey = Buffer.from(
                deployerWallet.privateKey.substring(2, 66),
                'hex',
            );
            const nonce = 0;
            const data = buildData(
                chainId,
                tokenOne.address,
                await tokenOne.name(),
                deployer.address,
                yieldBox.address,
                mintVal,
                nonce,
            );

            const signature = signTypedMessage(privateKey, { data });
            const { v, r, s } = fromRpcSig(signature);

            const permitEncoded = tokenOne.interface.encodeFunctionData(
                'permit',
                [
                    deployer.address,
                    yieldBox.address,
                    mintVal,
                    MAX_DEADLINE,
                    v,
                    r,
                    s,
                ],
            );

            const permitAllSigData = await getYieldBoxPermitSignature(
                'all',
                deployer,
                yieldBox,
                magnetar.address,
                tokenOneAssetId.toNumber(),
            );
            const permitAllEncoded = yieldBox.interface.encodeFunctionData(
                'permitAll',
                [
                    deployer.address,
                    magnetar.address,
                    MAX_DEADLINE,
                    permitAllSigData.v,
                    permitAllSigData.r,
                    permitAllSigData.s,
                ],
            );

            const depositAssetEncoded =
                MagnetarYieldBoxModule__factory.createInterface().encodeFunctionData(
                    'depositAsset',
                    [
                        {
                            yieldbox: yieldBox.address,
                            assetId: tokenOneAssetId,
                            from: deployer.address,
                            to: deployer.address,
                            amount: 0,
                            share: mintValShare,
                        } as YieldBoxDepositDataStruct,
                    ],
                );

            const calls = [
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: tokenOne.address,
                    value: 0,
                    allowFailure: false,
                    call: permitEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: permitAllEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_YIELDBOX_MODULE(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: depositAssetEncoded,
                },
            ];

            await cluster.updateContract(0, tokenOne.address, true);
            await cluster.updateContract(0, yieldBox.address, true);
            await magnetar.connect(deployer).burst(calls);

            const ybBalance = await yieldBox.balanceOf(
                deployer.address,
                tokenOneAssetId,
            );
            expect(ybBalance.gt(0)).to.be.true;
        });
    });

    describe('lend()', () => {
        it('should lend', async () => {
            const {
                deployer,
                yieldBox,
                usd0,
                penrose,
                __wethUsdcPrice,
                wethUsdcOracle,
                weth,
                wethAssetId,
                mediumRiskMC,
                magnetar,
                cluster,
            } = await loadFixture(register);

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            //Deploy & set Singularity
            const SGLLiquidation = new SGLLiquidation__factory(deployer);
            const _sglLiquidationModule = await SGLLiquidation.deploy();

            const SGLCollateral = new SGLCollateral__factory(deployer);
            const _sglCollateralModule = await SGLCollateral.deploy();

            const SGLBorrow = new SGLBorrow__factory(deployer);
            const _sglBorrowModule = await SGLBorrow.deploy();

            const SGLLeverage = new SGLLeverage__factory(deployer);
            const _sglLeverageModule = await SGLLeverage.deploy();

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const modulesData = {
                _liquidationModule: _sglLiquidationModule.address,
                _borrowModule: _sglBorrowModule.address,
                _collateralModule: _sglCollateralModule.address,
                _leverageModule: _sglLeverageModule.address,
            };

            const tokensData = {
                _asset: usd0.address,
                _assetId: usdoAssetId,
                _collateral: weth.address,
                _collateralId: wethAssetId,
            };
            const extraData = {
                penrose_: penrose.address,
                _oracle: wethUsdcOracle.address,
                _exchangeRatePrecision: ethers.utils.parseEther('1'),
                _collateralizationRate: 0,
                _liquidationCollateralizationRate: 0,
                _leverageExecutor: ethers.constants.AddressZero,
            };

            const sglData = new ethers.utils.AbiCoder().encode(
                [
                    'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                    'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                    'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
                ],
                [modulesData, tokensData, extraData],
            );

            await penrose.registerSingularity(
                mediumRiskMC.address,
                sglData,
                true,
            );
            const wethUsdoSingularity = new ethers.Contract(
                await penrose.clonesOf(
                    mediumRiskMC.address,
                    (await penrose.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
                SingularityArtifact.abi,
                ethers.provider,
            ).connect(deployer);

            //Deploy & set LiquidationQueue
            await usd0.setMinterStatus(wethUsdoSingularity.address, true);
            await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

            const usdoAmount = ethers.BigNumber.from((1e6).toString());
            const usdoShare = await yieldBox.toShare(
                usdoAssetId,
                usdoAmount,
                false,
            );
            await usd0.mint(deployer.address, usdoAmount);

            const chainId = await getChainId();

            const accounts: any = config.networks.hardhat.accounts;
            const deployerWallet = ethers.Wallet.fromMnemonic(
                accounts.mnemonic,
                accounts.path + '/0',
            );

            const privateKey = Buffer.from(
                deployerWallet.privateKey.substring(2, 66),
                'hex',
            );
            const nonce = 0;
            const data = buildData(
                chainId,
                usd0.address,
                await usd0.name(),
                deployer.address,
                yieldBox.address,
                usdoAmount.toNumber(),
                nonce,
            );

            const signature = signTypedMessage(privateKey, { data });
            const { v, r, s } = fromRpcSig(signature);

            const permitEncoded = usd0.interface.encodeFunctionData('permit', [
                deployer.address,
                yieldBox.address,
                usdoAmount,
                MAX_DEADLINE,
                v,
                r,
                s,
            ]);

            let permitAllSigData = await getYieldBoxPermitSignature(
                'all',
                deployer,
                yieldBox,
                magnetar.address,
                usdoAssetId.toNumber(),
            );
            const permitAllEncoded = yieldBox.interface.encodeFunctionData(
                'permitAll',
                [
                    deployer.address,
                    magnetar.address,
                    MAX_DEADLINE,
                    permitAllSigData.v,
                    permitAllSigData.r,
                    permitAllSigData.s,
                ],
            );

            permitAllSigData = await getYieldBoxPermitSignature(
                'all',
                deployer,
                yieldBox,
                wethUsdoSingularity.address,
                usdoAssetId.toNumber(),
                MAX_DEADLINE,
                { nonce: 1 },
            );
            const permitAllSGLEncoded = yieldBox.interface.encodeFunctionData(
                'permitAll',
                [
                    deployer.address,
                    wethUsdoSingularity.address,
                    MAX_DEADLINE,
                    permitAllSigData.v,
                    permitAllSigData.r,
                    permitAllSigData.s,
                ],
            );
            const depositAssetEncoded =
                MagnetarYieldBoxModule__factory.createInterface().encodeFunctionData(
                    'depositAsset',
                    [
                        {
                            yieldbox: yieldBox.address,
                            assetId: usdoAssetId,
                            from: deployer.address,
                            to: deployer.address,
                            amount: 0,
                            share: usdoShare,
                        } as YieldBoxDepositDataStruct,
                    ],
                );

            const sglLendEncoded =
                wethUsdoSingularity.interface.encodeFunctionData('addAsset', [
                    deployer.address,
                    deployer.address,
                    false,
                    usdoShare,
                ]);

            await wethUsdoSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            const calls = [
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: usd0.address,
                    value: 0,
                    allowFailure: false,
                    call: permitEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: permitAllEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_PERMIT(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: permitAllSGLEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_YIELDBOX_MODULE(),
                    target: yieldBox.address,
                    value: 0,
                    allowFailure: false,
                    call: depositAssetEncoded,
                },
                {
                    id: await magnetar.MAGNETAR_ACTION_MARKET(),
                    target: wethUsdoSingularity.address,
                    value: 0,
                    allowFailure: false,
                    call: sglLendEncoded,
                },
            ];

            await cluster.updateContract(0, wethUsdoSingularity.address, true);
            await cluster.updateContract(0, yieldBox.address, true);
            await cluster.updateContract(0, usd0.address, true);
            await magnetar.connect(deployer).burst(calls);

            const ybBalance = await yieldBox.balanceOf(
                deployer.address,
                usdoAssetId,
            );
            expect(ybBalance.eq(0)).to.be.true;

            const sglBalance = await wethUsdoSingularity.balanceOf(
                deployer.address,
            );
            expect(sglBalance.gt(0)).to.be.true;
        });
    });

    describe('add asset', () => {
        it('Should deposit to yieldBox & add asset', async () => {
            const {
                weth,
                wethUsdcSingularity,
                deployer,
                initContracts,
                magnetar,
                cluster,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
            weth.freeMint(mintVal);

            await weth.approve(magnetar.address, mintVal);
            await wethUsdcSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            await cluster.updateContract(0, wethUsdcSingularity.address, true);
            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_MINT_MODULE(),
                    allowFailure: false,
                    target: magnetar.address,
                    value: 0,
                    call: MagnetarMintModule__factory.createInterface().encodeFunctionData(
                        'mintBBLendSGLLockTOLP',
                        [
                            {
                                user: deployer.address,
                                lendAmount: mintVal,
                                mintData: {
                                    mint: false,
                                    mintAmount: 0,
                                    collateralDepositData: {
                                        deposit: false,
                                        amount: 0,
                                        extractFromSender: false,
                                    },
                                },
                                depositData: {
                                    deposit: true,
                                    amount: mintVal,
                                    extractFromSender: true,
                                },
                                lockData: {
                                    lock: false,
                                    amount: 0,
                                    lockDuration: 0,
                                    target: ethers.constants.AddressZero,
                                    fraction: 0,
                                },
                                participateData: {
                                    participate: false,
                                    target: ethers.constants.AddressZero,
                                    tOLPTokenId: 0,
                                },
                                externalContracts: {
                                    singularity: wethUsdcSingularity.address,
                                    magnetar: magnetar.address,
                                    bigBang: ethers.constants.AddressZero,
                                    marketHelper: marketHelper.address,
                                },
                            } as MintFromBBAndLendOnSGLDataStruct,
                        ],
                    ),
                },
            ]);
        });

        it('Should deposit to yieldBox & add asset to singularity through burst', async () => {
            const {
                weth,
                yieldBox,
                wethUsdcSingularity,
                deployer,
                initContracts,
                magnetar,
                wethAssetId,
                cluster,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
            weth.freeMint(mintVal);

            await weth.approve(magnetar.address, ethers.constants.MaxUint256);
            await wethUsdcSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            await cluster.updateContract(0, wethUsdcSingularity.address, true);
            const lendFn =
                MagnetarMintModule__factory.createInterface().encodeFunctionData(
                    'mintBBLendSGLLockTOLP',
                    [
                        {
                            user: deployer.address,
                            lendAmount: mintVal,
                            mintData: {
                                mint: false,
                                mintAmount: 0,
                                collateralDepositData: {
                                    deposit: false,
                                    amount: 0,
                                    extractFromSender: false,
                                },
                            },
                            depositData: {
                                deposit: true,
                                amount: mintVal,
                                extractFromSender: true,
                            },
                            lockData: {
                                lock: false,
                                amount: 0,
                                lockDuration: 0,
                                target: ethers.constants.AddressZero,
                                fraction: 0,
                            },
                            participateData: {
                                participate: false,
                                target: ethers.constants.AddressZero,
                                tOLPTokenId: 0,
                            },
                            externalContracts: {
                                singularity: wethUsdcSingularity.address,
                                magnetar: magnetar.address,
                                bigBang: ethers.constants.AddressZero,
                                marketHelper: marketHelper.address,
                            },
                        } as MintFromBBAndLendOnSGLDataStruct,
                    ],
                );

            let balanceOfSGL = await wethUsdcSingularity.balanceOf(
                deployer.address,
            );
            expect(balanceOfSGL.gt(0)).to.be.true;

            await magnetar.connect(deployer).burst(
                [
                    {
                        id: await magnetar.MAGNETAR_ACTION_MINT_MODULE(),
                        target: magnetar.address,
                        value: ethers.utils.parseEther('2'),
                        allowFailure: false,
                        call: lendFn,
                    },
                ],
                {
                    value: ethers.utils.parseEther('2'),
                },
            );

            balanceOfSGL = await wethUsdcSingularity.balanceOf(
                deployer.address,
            );
            const amount = await yieldBox.toAmount(
                wethAssetId,
                balanceOfSGL,
                false,
            );
            expect(amount.gte(mintVal)).to.be.true;
        });
    });

    describe('add collateral', () => {
        it('should deposit, add collateral, borrow and withdraw through burst', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                deployer,
                yieldBox,
                cluster,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = deployer.address.split('0x');
            const withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            const borrowFn =
                MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                    'depositAddCollateralAndBorrowFromMarket',
                    [
                        {
                            market: wethUsdcSingularity.address,
                            marketHelper: marketHelper.address,
                            user: eoa1.address,
                            collateralAmount: usdcMintVal,
                            borrowAmount: borrowAmount,
                            deposit: true,
                            withdrawParams: withdrawToChainData,
                            value: ethers.utils.parseEther('2'),
                        } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                    ],
                );
            let borrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(borrowPart.eq(0)).to.be.true;
            await magnetar.connect(eoa1).burst(
                [
                    {
                        id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                        target: magnetar.address,
                        value: ethers.utils.parseEther('2'),
                        allowFailure: false,
                        call: borrowFn,
                    },
                ],
                {
                    value: ethers.utils.parseEther('2'),
                },
            );
            borrowPart = await wethUsdcSingularity.userBorrowPart(eoa1.address);
            expect(borrowPart.gte(borrowAmount)).to.be.true;
        });

        it('should deposit, add collateral and borrow through Magnetar', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                yieldBox,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = eoa1.address.split('0x');

            const withdrawToChainData = {
                withdraw: false,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };

            const depositAddCollateralAndBorrowFromMarketData = {
                market: wethUsdcSingularity.address,
                marketHelper: marketHelper.address,
                user: eoa1.address,
                collateralAmount: usdcMintVal,
                borrowAmount: borrowAmount,
                deposit: true,
                withdrawParams: withdrawToChainData,
                value: ethers.utils.parseEther('2'),
            };

            const depositAddCollateralAndBorrowFromMarketEncoded =
                MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                    'depositAddCollateralAndBorrowFromMarket',
                    [depositAddCollateralAndBorrowFromMarketData],
                );
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: depositAddCollateralAndBorrowFromMarketEncoded,
                },
            ]);
        });

        it('should deposit, add collateral, borrow and withdraw through Magnetar', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                yieldBox,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);
            const receiverSplit = eoa1.address.split('0x');
            const withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                        'depositAddCollateralAndBorrowFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                collateralAmount: usdcMintVal,
                                borrowAmount: borrowAmount,
                                deposit: true,
                                withdrawParams: withdrawToChainData,
                                value: ethers.utils.parseEther('2'),
                            } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                        ],
                    ),
                },
            ]);
        });

        it('should deposit, add collateral, borrow and withdraw through Magnetar without withdraw', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                yieldBox,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = deployer.address.split('0x');
            const withdrawToChainData = {
                withdraw: false,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                        'depositAddCollateralAndBorrowFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                collateralAmount: usdcMintVal,
                                borrowAmount: borrowAmount,
                                deposit: true,
                                withdrawParams: withdrawToChainData,
                                value: ethers.utils.parseEther('2'),
                            } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                        ],
                    ),
                },
            ]);
        });

        it('should add collateral, borrow and withdraw through Magnetar', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                usdcAssetId,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                yieldBox,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await approveTokensAndSetBarApproval(eoa1);
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approve(magnetar.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    usdcAssetId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                );

            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = eoa1.address.split('0x');
            const withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                        'depositAddCollateralAndBorrowFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                collateralAmount: usdcMintVal,
                                borrowAmount: borrowAmount,
                                deposit: false,
                                withdrawParams: withdrawToChainData,
                                value: ethers.utils.parseEther('2'),
                            } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                        ],
                    ),
                },
            ]);
        });
    });

    describe('repay', () => {
        it('should deposit and repay through Magnetar', async () => {
            const {
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                yieldBox,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);
            const receiverSplit = eoa1.address.split('0x');
            let withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                        'depositAddCollateralAndBorrowFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                collateralAmount: usdcMintVal,
                                borrowAmount: borrowAmount,
                                deposit: true,
                                withdrawParams: withdrawToChainData,
                                value: ethers.utils.parseEther('2'),
                            } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                        ],
                    ),
                },
            ]);

            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

            await weth
                .connect(eoa1)
                .approve(magnetar.address, userBorrowPart.mul(2));
            await wethUsdcSingularity
                .connect(eoa1)
                .approve(
                    magnetar.address,
                    await yieldBox.toShare(
                        assetId,
                        userBorrowPart.mul(2),
                        true,
                    ),
                );

            withdrawToChainData = {
                withdraw: false,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: userBorrowPart,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_ASSET_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarAssetModule__factory.createInterface().encodeFunctionData(
                        'depositRepayAndRemoveCollateralFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                depositAmount: userBorrowPart.mul(2),
                                repayAmount: userBorrowPart,
                                collateralAmount: 0,
                                withdrawCollateralParams: withdrawToChainData,
                            } as DepositRepayAndRemoveCollateralFromMarketDataStruct,
                        ],
                    ),
                },
            ]);
        });

        it('should deposit, repay, remove collateral and withdraw through Magnetar', async () => {
            const {
                usdcAssetId,
                weth,
                wethUsdcSingularity,
                usdc,
                eoa1,
                initContracts,
                yieldBox,
                magnetar,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            const collateralId = await wethUsdcSingularity.collateralId();
            await initContracts(); // To prevent `Singularity: below minimum`

            const borrowAmount = ethers.BigNumber.from((1e17).toString());
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            // We get asset
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We lend WETH as deployer
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);

            await usdc.connect(eoa1).approve(magnetar.address, usdcMintVal);
            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(magnetar.address, ethers.constants.MaxUint256);

            const receiverSplit = eoa1.address.split('0x');
            let withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.assetId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_COLLATERAL_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarCollateralModule__factory.createInterface().encodeFunctionData(
                        'depositAddCollateralAndBorrowFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                collateralAmount: usdcMintVal,
                                borrowAmount: borrowAmount,
                                deposit: true,
                                withdrawParams: withdrawToChainData,
                                value: ethers.utils.parseEther('2'),
                            } as DepositAddCollateralAndBorrowFromMarketDataStruct,
                        ],
                    ),
                },
            ]);

            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );

            const collateralShare =
                await wethUsdcSingularity.userCollateralShare(eoa1.address);
            const collateralAmount = await yieldBox.toAmount(
                usdcAssetId,
                collateralShare,
                false,
            );

            await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

            await weth
                .connect(eoa1)
                .approve(magnetar.address, userBorrowPart.mul(2));

            await wethUsdcSingularity
                .connect(eoa1)
                .approveBorrow(
                    magnetar.address,
                    await yieldBox.toShare(
                        collateralId,
                        collateralAmount,
                        true,
                    ),
                );

            withdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdcSingularity.collateralId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: eoa1.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: collateralAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.connect(eoa1).burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_ASSET_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarAssetModule__factory.createInterface().encodeFunctionData(
                        'depositRepayAndRemoveCollateralFromMarket',
                        [
                            {
                                market: wethUsdcSingularity.address,
                                marketHelper: marketHelper.address,
                                user: eoa1.address,
                                depositAmount: userBorrowPart.mul(2),
                                repayAmount: userBorrowPart,
                                collateralAmount,
                                withdrawCollateralParams: withdrawToChainData,
                            } as DepositRepayAndRemoveCollateralFromMarketDataStruct,
                        ],
                    ),
                },
            ]);
        });
    });

    describe('mint & lend', () => {
        it('should mint and lend', async () => {
            const {
                weth,
                createWethUsd0Singularity,
                wethBigBangMarket,
                usd0,
                usdc,
                penrose,
                wethAssetId,
                mediumRiskMC,
                initContracts,
                yieldBox,
                magnetar,
                deployer,
                cluster,
                multiSwapper,
                marketHelper,
            } = await loadFixture(register);

            await initContracts();

            //set assets oracle
            const OracleMock = new OracleMock__factory(deployer);
            const usdoUsdcOracle = await OracleMock.deploy(
                'USDOUSDCOracle',
                'USDOUSDCOracle',
                ethers.utils.parseEther('1'),
            );
            await usdoUsdcOracle.deployed();
            await usdoUsdcOracle.set(ethers.utils.parseEther('1'));

            const setAssetOracleFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setAssetOracle',
                    [usdoUsdcOracle.address, '0x'],
                );
            await penrose.executeMarketFn(
                [wethBigBangMarket.address],
                [setAssetOracleFn],
                true,
            );

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            const { wethUsdoSingularity } = await createWethUsd0Singularity(
                usd0,
                weth,
                penrose,
                usdoAssetId,
                wethAssetId,
                mediumRiskMC,
                yieldBox,
                multiSwapper.address,
                cluster.address,
                ethers.utils.parseEther('1'),
                false,
            );

            const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                1000,
            );

            // We get asset
            await weth.freeMint(wethMintVal);

            // Approve tokens
            // await approveTokensAndSetBarApproval();
            await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
            await weth.approve(magnetar.address, wethMintVal);
            await wethUsdoSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            await wethBigBangMarket.approveBorrow(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            await cluster.updateContract(0, wethUsdoSingularity.address, true);
            await cluster.updateContract(0, wethBigBangMarket.address, true);

            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_MINT_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarMintModule__factory.createInterface().encodeFunctionData(
                        'mintBBLendSGLLockTOLP',
                        [
                            {
                                user: deployer.address,
                                lendAmount: borrowAmount,
                                mintData: {
                                    mint: true,
                                    mintAmount: borrowAmount,
                                    collateralDepositData: {
                                        deposit: true,
                                        amount: wethMintVal,
                                        extractFromSender: true,
                                    },
                                },
                                depositData: {
                                    deposit: false,
                                    amount: 0,
                                    extractFromSender: false,
                                },
                                lockData: {
                                    lock: false,
                                    amount: 0,
                                    lockDuration: 0,
                                    target: ethers.constants.AddressZero,
                                    fraction: 0,
                                },

                                participateData: {
                                    participate: false,
                                    target: ethers.constants.AddressZero,
                                    tOLPTokenId: 0,
                                },

                                externalContracts: {
                                    singularity: wethUsdoSingularity.address,
                                    magnetar: magnetar.address,
                                    bigBang: wethBigBangMarket.address,
                                    marketHelper: marketHelper.address,
                                },
                            } as MintFromBBAndLendOnSGLDataStruct,
                        ],
                    ),
                },
            ]);

            const bingBangCollateralShare =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const bingBangCollateralAmount = await yieldBox.toAmount(
                wethAssetId,
                bingBangCollateralShare,
                false,
            );
            expect(bingBangCollateralAmount.eq(wethMintVal)).to.be.true;

            const bingBangBorrowPart = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(bingBangBorrowPart.gte(borrowAmount)).to.be.true;

            const lentAssetShare = await wethUsdoSingularity.balanceOf(
                deployer.address,
            );
            const lentAssetAmount = await yieldBox.toAmount(
                usdoAssetId,
                lentAssetShare,
                false,
            );
            expect(lentAssetAmount.eq(borrowAmount)).to.be.true;
        });
    });

    describe('remove asset', () => {
        it('should remove asset, repay BingBang, remove collateral and withdraw', async () => {
            const {
                weth,
                createWethUsd0Singularity,
                wethBigBangMarket,
                usd0,
                usdc,
                penrose,
                wethAssetId,
                mediumRiskMC,
                initContracts,
                yieldBox,
                magnetar,
                cluster,
                deployer,
                multiSwapper,
                marketHelper,
            } = await loadFixture(register);

            await initContracts();

            //set assets oracle
            const OracleMock = new OracleMock__factory(deployer);
            const usdoUsdcOracle = await OracleMock.deploy(
                'USDOUSDCOracle',
                'USDOUSDCOracle',
                ethers.utils.parseEther('1'),
            );
            await usdoUsdcOracle.deployed();
            await usdoUsdcOracle.set(ethers.utils.parseEther('1'));

            const setAssetOracleFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setAssetOracle',
                    [usdoUsdcOracle.address, '0x'],
                );
            await penrose.executeMarketFn(
                [wethBigBangMarket.address],
                [setAssetOracleFn],
                true,
            );

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            const { wethUsdoSingularity } = await createWethUsd0Singularity(
                usd0,
                weth,
                penrose,
                usdoAssetId,
                wethAssetId,
                mediumRiskMC,
                yieldBox,
                multiSwapper.address,
                cluster.address,
                ethers.utils.parseEther('1'),
                false,
            );

            const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                1000,
            );

            await usd0.mint(deployer.address, borrowAmount.mul(2));
            // We get asset
            await weth.freeMint(wethMintVal);

            // Approve tokens
            // await approveTokensAndSetBarApproval();
            await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
            await weth.approve(magnetar.address, wethMintVal);
            await wethUsdoSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            await wethBigBangMarket.approveBorrow(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            const borrowFeeUpdateFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
                        ethers.constants.AddressZero,
                        '0x',
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
                );
            await penrose.executeMarketFn(
                [wethBigBangMarket.address],
                [borrowFeeUpdateFn],
                true,
            );

            await cluster.updateContract(0, wethUsdoSingularity.address, true);
            await cluster.updateContract(0, wethBigBangMarket.address, true);

            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_MINT_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarMintModule__factory.createInterface().encodeFunctionData(
                        'mintBBLendSGLLockTOLP',
                        [
                            {
                                user: deployer.address,
                                lendAmount: borrowAmount,
                                mintData: {
                                    mint: true,
                                    mintAmount: borrowAmount,
                                    collateralDepositData: {
                                        deposit: true,
                                        amount: wethMintVal,
                                        extractFromSender: true,
                                    },
                                },
                                depositData: {
                                    deposit: false,
                                    amount: 0,
                                    extractFromSender: false,
                                },
                                lockData: {
                                    lock: false,
                                    amount: 0,
                                    lockDuration: 0,
                                    target: ethers.constants.AddressZero,
                                    fraction: 0,
                                },

                                participateData: {
                                    participate: false,
                                    target: ethers.constants.AddressZero,
                                    tOLPTokenId: 0,
                                },

                                externalContracts: {
                                    singularity: wethUsdoSingularity.address,
                                    magnetar: magnetar.address,
                                    bigBang: wethBigBangMarket.address,
                                    marketHelper: marketHelper.address,
                                },
                            } as MintFromBBAndLendOnSGLDataStruct,
                        ],
                    ),
                },
            ]);

            await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox.depositAsset(
                usdoAssetId,
                deployer.address,
                deployer.address,
                borrowAmount,
                0,
            );
            const wethBalanceBefore = await weth.balanceOf(deployer.address);
            const fraction = await wethUsdoSingularity.balanceOf(
                deployer.address,
            );
            const fractionAmount = await yieldBox.toAmount(
                usdoAssetId,
                fraction,
                false,
            );
            const totalBingBangCollateral =
                await wethBigBangMarket.userCollateralShare(deployer.address);

            const totalBingBangCollateralAmount = await yieldBox.toAmount(
                await wethBigBangMarket.collateralId(),
                totalBingBangCollateral,
                false,
            );

            await cluster.updateContract(1, wethBigBangMarket.address, true);
            await cluster.updateContract(1, wethUsdoSingularity.address, true);

            await wethBigBangMarket.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            await wethBigBangMarket.approveBorrow(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            const receiverSplit = deployer.address.split('0x');
            const assetWithdrawToChainData = {
                withdraw: false,
                yieldBox: yieldBox.address,
                assetId: usdoAssetId,
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            const collateralWithdrawToChainData = {
                withdraw: true,
                yieldBox: yieldBox.address,
                assetId: await wethUsdoSingularity.collateralId(),
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: totalBingBangCollateralAmount.div(5),
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_OPTION_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarOptionModule__factory.createInterface().encodeFunctionData(
                        'exitPositionAndRemoveCollateral',
                        [
                            {
                                user: deployer.address,
                                externalData: {
                                    magnetar: magnetar.address,
                                    singularity: wethUsdoSingularity.address,
                                    bigBang: wethBigBangMarket.address,
                                    marketHelper: marketHelper.address,
                                },
                                removeAndRepayData: {
                                    removeAssetFromSGL: true,
                                    removeAmount: fractionAmount.div(2),
                                    repayAssetOnBB: true,
                                    repayAmount: await yieldBox.toAmount(
                                        usdoAssetId,
                                        fraction.div(3),
                                        false,
                                    ),
                                    removeCollateralFromBB: true,
                                    collateralAmount:
                                        totalBingBangCollateralAmount.div(5),
                                    exitData: {
                                        exit: false,
                                        oTAPTokenID: 0,
                                        target: ethers.constants.AddressZero,
                                    },
                                    unlockData: {
                                        unlock: false,
                                        target: ethers.constants.AddressZero,
                                        tokenId: 0,
                                    },
                                    assetWithdrawData: assetWithdrawToChainData,
                                    collateralWithdrawData:
                                        collateralWithdrawToChainData,
                                },
                            } as ExitPositionAndRemoveCollateralDataStruct,
                        ],
                    ),
                },
            ]);

            const wethBalanceAfter = await weth.balanceOf(deployer.address);

            expect(wethBalanceBefore.eq(0)).to.be.true;
            expect(wethBalanceAfter.eq(wethMintVal.div(5))).to.be.true;
        });

        it('should remove asset, repay BingBang and remove collateral', async () => {
            const {
                weth,
                createWethUsd0Singularity,
                wethBigBangMarket,
                usd0,
                usdc,
                penrose,
                wethAssetId,
                mediumRiskMC,
                initContracts,
                yieldBox,
                magnetar,
                deployer,
                cluster,
                multiSwapper,
                marketHelper,
            } = await loadFixture(register);

            await initContracts();

            //set assets oracle
            const OracleMock = new OracleMock__factory(deployer);
            const usdoUsdcOracle = await OracleMock.deploy(
                'USDOUSDCOracle',
                'USDOUSDCOracle',
                ethers.utils.parseEther('1'),
            );
            await usdoUsdcOracle.deployed();
            await usdoUsdcOracle.set(ethers.utils.parseEther('1'));

            const setAssetOracleFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setAssetOracle',
                    [usdoUsdcOracle.address, '0x'],
                );
            await penrose.executeMarketFn(
                [wethBigBangMarket.address],
                [setAssetOracleFn],
                true,
            );

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            const { wethUsdoSingularity } = await createWethUsd0Singularity(
                usd0,
                weth,
                penrose,
                usdoAssetId,
                wethAssetId,
                mediumRiskMC,
                yieldBox,
                multiSwapper.address,
                cluster.address,
                ethers.utils.parseEther('1'),
                false,
            );

            const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                1000,
            );

            await usd0.mint(deployer.address, borrowAmount.mul(2));
            // We get asset
            await weth.freeMint(wethMintVal);

            // Approve tokens
            // await approveTokensAndSetBarApproval();
            await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
            await weth.approve(magnetar.address, wethMintVal);
            await wethUsdoSingularity.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );
            await wethBigBangMarket.approveBorrow(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            await cluster.updateContract(0, wethBigBangMarket.address, true);
            await cluster.updateContract(0, wethUsdoSingularity.address, true);

            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_MINT_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarMintModule__factory.createInterface().encodeFunctionData(
                        'mintBBLendSGLLockTOLP',
                        [
                            {
                                user: deployer.address,
                                lendAmount: borrowAmount,
                                mintData: {
                                    mint: true,
                                    mintAmount: borrowAmount,
                                    collateralDepositData: {
                                        deposit: true,
                                        amount: wethMintVal,
                                        extractFromSender: true,
                                    },
                                },
                                depositData: {
                                    deposit: false,
                                    amount: 0,
                                    extractFromSender: false,
                                },
                                lockData: {
                                    lock: false,
                                    amount: 0,
                                    lockDuration: 0,
                                    target: ethers.constants.AddressZero,
                                    fraction: 0,
                                },
                                participateData: {
                                    participate: false,
                                    target: ethers.constants.AddressZero,
                                    tOLPTokenId: 0,
                                },
                                externalContracts: {
                                    singularity: wethUsdoSingularity.address,
                                    magnetar: magnetar.address,
                                    bigBang: wethBigBangMarket.address,
                                    marketHelper: marketHelper.address,
                                },
                            } as MintFromBBAndLendOnSGLDataStruct,
                        ],
                    ),
                },
            ]);

            await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox.depositAsset(
                usdoAssetId,
                deployer.address,
                deployer.address,
                borrowAmount,
                0,
            );
            const wethCollateralBefore =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const fraction = await wethUsdoSingularity.balanceOf(
                deployer.address,
            );
            const fractionAmount = await yieldBox.toAmount(
                usdoAssetId,
                fraction,
                false,
            );
            const totalBingBangCollateral =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const totalBingBangCollateralAmount = await yieldBox.toAmount(
                await wethBigBangMarket.collateralId(),
                totalBingBangCollateral,
                false,
            );

            await cluster.updateContract(1, wethBigBangMarket.address, true);
            await cluster.updateContract(1, wethUsdoSingularity.address, true);

            const receiverSplit = deployer.address.split('0x');
            const withdrawToChainData = {
                withdraw: false,
                yieldBox: yieldBox.address,
                assetId: usdoAssetId,
                unwrap: false,
                lzSendParams: {
                    refundAddress: deployer.address,
                    fee: { lzTokenFee: 0, nativeFee: 0 },
                    extraOptions: '0x',
                    sendParam: {
                        amountLD: borrowAmount,
                        composeMsg: '0x',
                        dstEid: 0,
                        extraOptions: '0x',
                        minAmountLD: 0,
                        oftCmd: '0x',
                        to: '0x'.concat(receiverSplit[1].padStart(64, '0')), // address to bytes32
                    },
                },
                sendGas: 0,
                composeGas: 0,
                sendVal: 0,
                composeVal: 0,
                composeMsg: '0x',
                composeMsgType: 0,
            };
            await magnetar.burst([
                {
                    id: await magnetar.MAGNETAR_ACTION_OPTION_MODULE(),
                    target: magnetar.address,
                    value: 0,
                    allowFailure: false,
                    call: MagnetarOptionModule__factory.createInterface().encodeFunctionData(
                        'exitPositionAndRemoveCollateral',
                        [
                            {
                                user: deployer.address,
                                externalData: {
                                    magnetar: magnetar.address,
                                    singularity: wethUsdoSingularity.address,
                                    bigBang: wethBigBangMarket.address,
                                    marketHelper: marketHelper.address,
                                },
                                removeAndRepayData: {
                                    removeAssetFromSGL: true,
                                    removeAmount: fractionAmount.div(2),
                                    repayAssetOnBB: true,
                                    repayAmount: await yieldBox.toAmount(
                                        usdoAssetId,
                                        fraction.div(3),
                                        false,
                                    ),
                                    removeCollateralFromBB: true,
                                    collateralAmount:
                                        totalBingBangCollateralAmount.div(5),
                                    exitData: {
                                        exit: false,
                                        oTAPTokenID: 0,
                                        target: ethers.constants.AddressZero,
                                    },
                                    unlockData: {
                                        unlock: false,
                                        target: ethers.constants.AddressZero,
                                        tokenId: 0,
                                    },
                                    assetWithdrawData: withdrawToChainData,
                                    collateralWithdrawData: withdrawToChainData,
                                },
                            } as ExitPositionAndRemoveCollateralDataStruct,
                        ],
                    ),
                },
            ]);

            const wethCollateralAfter =
                await wethBigBangMarket.userCollateralShare(deployer.address);

            expect(wethCollateralAfter.lt(wethCollateralBefore)).to.be.true;

            const wethBalanceAfter = await weth.balanceOf(deployer.address);
            expect(wethBalanceAfter.eq(0)).to.be.true;
        });
    });
});

async function getYieldBoxPermitSignature(
    permitType: 'asset' | 'all',
    wallet: SignerWithAddress,
    token: YieldBox,
    spender: string,
    assetId: number,
    deadline = MAX_DEADLINE,
    permitConfig?: {
        nonce?: any;
        name?: string;
        chainId?: number;
        version?: string;
    },
) {
    const [nonce, name, version, chainId] = await Promise.all([
        permitConfig?.nonce ?? token.nonces(wallet.address),
        'YieldBox',
        permitConfig?.version ?? '1',
        permitConfig?.chainId ?? wallet.getChainId(),
    ]);

    const typesInfo = [
        {
            name: 'owner',
            type: 'address',
        },
        {
            name: 'spender',
            type: 'address',
        },
        {
            name: 'assetId',
            type: 'uint256',
        },
        {
            name: 'nonce',
            type: 'uint256',
        },
        {
            name: 'deadline',
            type: 'uint256',
        },
    ];

    return ethers.utils.splitSignature(
        await wallet._signTypedData(
            {
                name,
                version,
                chainId,
                verifyingContract: token.address,
            },
            permitType === 'asset'
                ? {
                      Permit: typesInfo,
                  }
                : {
                      PermitAll: typesInfo.filter(
                          (x) =>
                              permitType !== 'all' ||
                              (permitType === 'all' && x.name !== 'assetId'),
                      ),
                  },

            {
                ...(permitType === 'all' ? {} : { assetId }),
                owner: wallet.address,
                spender,
                assetId,
                nonce,
                deadline,
            },
        ),
    );
}

const buildData = (
    chainId: number,
    verifyingContract: string,
    name: string,
    owner: string,
    spender: string,
    value: number,
    nonce: number,
    deadline = MAX_DEADLINE,
) => ({
    primaryType: 'Permit',
    types: { EIP712Domain, Permit },
    domain: { name, version, chainId, verifyingContract },
    message: { owner, spender, value, nonce, deadline },
});

const EIP712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];

const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
];

async function getChainId(): Promise<number> {
    const chainIdHex = await hre.network.provider.send('eth_chainId', []);
    return BN(chainIdHex).toNumber();
}

export async function createTokenEmptyStrategy(
    deployer: any,
    yieldBox: string,
    token: string,
) {
    const ERC20WithoutStrategy = new ERC20WithoutStrategy__factory(deployer);
    const noStrategy = await ERC20WithoutStrategy.deploy(yieldBox, token);
    await noStrategy.deployed();
    return noStrategy;
}
