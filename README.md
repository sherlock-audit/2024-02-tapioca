
# Tapioca contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Q&A

### Q: On what chains are the smart contracts going to be deployed?
Arbitrum, Mainnet, Optimism, Avalanche
___

### Q: Which ERC20 tokens do you expect will interact with the smart contracts? 
USDC and others. We would like to support tokens that are pauseable (RWA), rebasing (WSTETH), upgradable, flash mintable, low decimal, and high decimal.
___

### Q: Which ERC721 tokens do you expect will interact with the smart contracts? 
None
___

### Q: Do you plan to support ERC1155?
No
___

### Q: Which ERC777 tokens do you expect will interact with the smart contracts? 
None
___

### Q: Are there any FEE-ON-TRANSFER tokens interacting with the smart contracts?

None
___

### Q: Are there any REBASING tokens interacting with the smart contracts?

WSTETH
___

### Q: Are the admins of the protocols your contracts integrate with (if any) TRUSTED or RESTRICTED?
TRUSTED
___

### Q: Is the admin/owner of the protocol/contracts TRUSTED or RESTRICTED?
TRUSTED
___

### Q: Are there any additional protocol roles? If yes, please explain in detail:
None
___

### Q: Is the code/contract expected to comply with any EIPs? Are there specific assumptions around adhering to those EIPs that Watsons should be aware of?
No specific assumptions of EIP compliance. Though if it presents a reasonable problem, it should be considered.
___

### Q: Please list any known issues/acceptable risks that should not result in a valid finding.
Zero address check
___

### Q: Please provide links to previous audits (if any).
1 - Certora Yieldbox:

https://3014726245-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FfBay3bZwWmLdUX02P7Qc%2Fuploads%2FZ0lrDxhdqWHMX5UdMrtC%2FTapioca_Certora_Audit.pdf?alt=media&token=9fbc7bd3-cccd-42a1-b6d3-22c36e2b795f

- Certora Appendix:

https://3014726245-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FfBay3bZwWmLdUX02P7Qc%2Fuploads%2FPIVXvEmuf0FzFZi1poyS%2FTapioca_Certora_Audit%20(Appendix).pdf?alt=media&token=49ad2755-e67c-4fb7-9d6b-3fea9081be12

2 - Code4rena (full scope):
https://code4rena.com/reports/2023-07-tapioca

3 - (peripherals):
Pashov Auditing Group + 0xWeiss and Nisedo:
https://3014726245-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FfBay3bZwWmLdUX02P7Qc%2Fuploads%2FacpTKQyK9l2Yc61DQbch%2FTapiocaDAO-security-review-report.pdf?alt=media&token=6eedce9c-8ac8-4fa2-9605-05e4a96bddaa

4 - Spearbit (full scope)

___

### Q: Are there any off-chain mechanisms or off-chain procedures for the protocol (keeper bots, input validation expectations, etc)?
- `mTOFT` contract has a function to allow rebalancing of assets, this is done off-chain by a Gelato bot. The caller address of `mTOFT.extractUnderlying()` needs to be whitelisted to perform the action.

- `Penrose` contract has a `withdrawAllMarketFees()` that is called periodically by a Gelato bot.
___

### Q: In case of external protocol integrations, are the risks of external contracts pausing or executing an emergency withdrawal acceptable? If not, Watsons will submit issues related to these situations that can harm your protocol's functionality.
External issues/integrations that would affect Tapioca, should be considered.
___

### Q: Do you expect to use any of the following tokens with non-standard behaviour with the smart contracts?
Not specifically, just make the case for tokens that are balance changing, rebasing (WSTETH), pauseable (RWA), upgradable, flash mintable, low decimal, and high decimal. Issues with specific 1 of 1 tokens with special traits should not be a valid medium as we will be checking any token introduced in the system. However, if you know of any token that would be incompatible and falls on one of the categories listed on top, it would be helpful to let us know (probably internally, as otherwise it would impact your valid issue threshold).
___

### Q: Add links to relevant protocol resources
Docs: https://docs.tapioca.xyz/tapioca/
Whitepaper: https://www.tapioca.xyz/docs/twAML.pdf
Pearl Club Academy videos(overall understanding of the protocol): https://www.youtube.com/watch?v=dCp-br2mImU&list=PLuyOXCNGGKVzNsFYCKq-627vC8cAPnzYp

___



# Audit scope

[TapiocaZ @ c9440cb5ff9e898fe01b8c8b1759a282d8aaaffb](https://github.com/Tapioca-DAO/TapiocaZ/tree/c9440cb5ff9e898fe01b8c8b1759a282d8aaaffb)
- [TapiocaZ/contracts/Balancer.sol](TapiocaZ/contracts/Balancer.sol)
- [TapiocaZ/contracts/tOFT/BaseTOFT.sol](TapiocaZ/contracts/tOFT/BaseTOFT.sol)
- [TapiocaZ/contracts/tOFT/BaseTOFTTokenMsgType.sol](TapiocaZ/contracts/tOFT/BaseTOFTTokenMsgType.sol)
- [TapiocaZ/contracts/tOFT/TOFT.sol](TapiocaZ/contracts/tOFT/TOFT.sol)
- [TapiocaZ/contracts/tOFT/TOFTVault.sol](TapiocaZ/contracts/tOFT/TOFTVault.sol)
- [TapiocaZ/contracts/tOFT/extensions/TOFTHelper.sol](TapiocaZ/contracts/tOFT/extensions/TOFTHelper.sol)
- [TapiocaZ/contracts/tOFT/libraries/TOFTMsgCodec.sol](TapiocaZ/contracts/tOFT/libraries/TOFTMsgCodec.sol)
- [TapiocaZ/contracts/tOFT/mTOFT.sol](TapiocaZ/contracts/tOFT/mTOFT.sol)
- [TapiocaZ/contracts/tOFT/modules/BaseTOFTReceiver.sol](TapiocaZ/contracts/tOFT/modules/BaseTOFTReceiver.sol)
- [TapiocaZ/contracts/tOFT/modules/ModuleManager.sol](TapiocaZ/contracts/tOFT/modules/ModuleManager.sol)
- [TapiocaZ/contracts/tOFT/modules/TOFTGenericReceiverModule.sol](TapiocaZ/contracts/tOFT/modules/TOFTGenericReceiverModule.sol)
- [TapiocaZ/contracts/tOFT/modules/TOFTMarketReceiverModule.sol](TapiocaZ/contracts/tOFT/modules/TOFTMarketReceiverModule.sol)
- [TapiocaZ/contracts/tOFT/modules/TOFTOptionsReceiverModule.sol](TapiocaZ/contracts/tOFT/modules/TOFTOptionsReceiverModule.sol)
- [TapiocaZ/contracts/tOFT/modules/TOFTReceiver.sol](TapiocaZ/contracts/tOFT/modules/TOFTReceiver.sol)
- [TapiocaZ/contracts/tOFT/modules/TOFTSender.sol](TapiocaZ/contracts/tOFT/modules/TOFTSender.sol)
- [TapiocaZ/contracts/tOFT/modules/mTOFTReceiver.sol](TapiocaZ/contracts/tOFT/modules/mTOFTReceiver.sol)
- [TapiocaZ/contracts/util/ERC4494.sol](TapiocaZ/contracts/util/ERC4494.sol)




[Tapioca-bar @ 62287ff0be08374a3ac15ec9f98597d26e41d772](https://github.com/Tapioca-DAO/Tapioca-bar/tree/62287ff0be08374a3ac15ec9f98597d26e41d772)
- [Tapioca-bar/contracts/Penrose.sol](Tapioca-bar/contracts/Penrose.sol)
- [Tapioca-bar/contracts/markets/Market.sol](Tapioca-bar/contracts/markets/Market.sol)
- [Tapioca-bar/contracts/markets/MarketERC20.sol](Tapioca-bar/contracts/markets/MarketERC20.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBBorrow.sol](Tapioca-bar/contracts/markets/bigBang/BBBorrow.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBCollateral.sol](Tapioca-bar/contracts/markets/bigBang/BBCollateral.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBCommon.sol](Tapioca-bar/contracts/markets/bigBang/BBCommon.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBLendingCommon.sol](Tapioca-bar/contracts/markets/bigBang/BBLendingCommon.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBLeverage.sol](Tapioca-bar/contracts/markets/bigBang/BBLeverage.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBLiquidation.sol](Tapioca-bar/contracts/markets/bigBang/BBLiquidation.sol)
- [Tapioca-bar/contracts/markets/bigBang/BBStorage.sol](Tapioca-bar/contracts/markets/bigBang/BBStorage.sol)
- [Tapioca-bar/contracts/markets/bigBang/BigBang.sol](Tapioca-bar/contracts/markets/bigBang/BigBang.sol)
- [Tapioca-bar/contracts/markets/leverage/AssetToSGLPLeverageExecutor.sol](Tapioca-bar/contracts/markets/leverage/AssetToSGLPLeverageExecutor.sol)
- [Tapioca-bar/contracts/markets/leverage/AssetTotsDaiLeverageExecutor.sol](Tapioca-bar/contracts/markets/leverage/AssetTotsDaiLeverageExecutor.sol)
- [Tapioca-bar/contracts/markets/leverage/BaseLeverageExecutor.sol](Tapioca-bar/contracts/markets/leverage/BaseLeverageExecutor.sol)
- [Tapioca-bar/contracts/markets/leverage/SimpleLeverageExecutor.sol](Tapioca-bar/contracts/markets/leverage/SimpleLeverageExecutor.sol)
- [Tapioca-bar/contracts/markets/origins/Origins.sol](Tapioca-bar/contracts/markets/origins/Origins.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLBorrow.sol](Tapioca-bar/contracts/markets/singularity/SGLBorrow.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLCollateral.sol](Tapioca-bar/contracts/markets/singularity/SGLCollateral.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLCommon.sol](Tapioca-bar/contracts/markets/singularity/SGLCommon.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLLendingCommon.sol](Tapioca-bar/contracts/markets/singularity/SGLLendingCommon.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLLeverage.sol](Tapioca-bar/contracts/markets/singularity/SGLLeverage.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLLiquidation.sol](Tapioca-bar/contracts/markets/singularity/SGLLiquidation.sol)
- [Tapioca-bar/contracts/markets/singularity/SGLStorage.sol](Tapioca-bar/contracts/markets/singularity/SGLStorage.sol)
- [Tapioca-bar/contracts/markets/singularity/Singularity.sol](Tapioca-bar/contracts/markets/singularity/Singularity.sol)
- [Tapioca-bar/contracts/usdo/BaseUsdo.sol](Tapioca-bar/contracts/usdo/BaseUsdo.sol)
- [Tapioca-bar/contracts/usdo/BaseUsdoTokenMsgType.sol](Tapioca-bar/contracts/usdo/BaseUsdoTokenMsgType.sol)
- [Tapioca-bar/contracts/usdo/USDOFlashloanHelper.sol](Tapioca-bar/contracts/usdo/USDOFlashloanHelper.sol)
- [Tapioca-bar/contracts/usdo/Usdo.sol](Tapioca-bar/contracts/usdo/Usdo.sol)
- [Tapioca-bar/contracts/usdo/extensions/UsdoHelper.sol](Tapioca-bar/contracts/usdo/extensions/UsdoHelper.sol)
- [Tapioca-bar/contracts/usdo/libraries/UsdoMsgCodec.sol](Tapioca-bar/contracts/usdo/libraries/UsdoMsgCodec.sol)
- [Tapioca-bar/contracts/usdo/modules/ModuleManager.sol](Tapioca-bar/contracts/usdo/modules/ModuleManager.sol)
- [Tapioca-bar/contracts/usdo/modules/UsdoMarketReceiverModule.sol](Tapioca-bar/contracts/usdo/modules/UsdoMarketReceiverModule.sol)
- [Tapioca-bar/contracts/usdo/modules/UsdoOptionReceiverModule.sol](Tapioca-bar/contracts/usdo/modules/UsdoOptionReceiverModule.sol)
- [Tapioca-bar/contracts/usdo/modules/UsdoReceiver.sol](Tapioca-bar/contracts/usdo/modules/UsdoReceiver.sol)
- [Tapioca-bar/contracts/usdo/modules/UsdoSender.sol](Tapioca-bar/contracts/usdo/modules/UsdoSender.sol)


