// pragma solidity ^0.8.4;

// import "./Base.t.sol";
// import "../src/DataTypes.sol";
// import "../src/Constants.sol";

// import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// contract PositionApprovalTransferTest is BaseTest {
//     event PositionApproval(
//         address indexed owner,
//         address indexed token,
//         address indexed operator,
//         uint256 id,
//         bytes32 positionId,
//         uint208 amount,
//         uint48 expiration,
//         bool nonceInvalidated,
//         uint256 nonce
//     );

//     struct TestData {
//         address token;
//         address owner;
//         address spender;
//         uint256 tokenId;
//         uint208 amount;
//         uint48 expiration;
//         bytes32 positionId;
//     }

//     struct SignatureDetails {
//         address operator;
//         address token;
//         uint256 tokenId;
//         bytes32 positionId;
//         uint208 amount;
//         uint256 nonce;
//         uint48 approvalExpiration;
//         uint48 sigDeadline;
//         uint256 tokenOwnerKey;
//     }

//     TestData private testData;
    
//     function setUp() public override {
//         super.setUp();

//         testData = TestData({
//             token: address(0),
//             owner: alice,
//             spender: bob,
//             tokenId: 1,
//             amount: 1,
//             expiration: uint48(block.timestamp),
//             positionId: bytes32(0)
//         });
//     }

//     modifier whenExpirationIsInTheFuture(uint48 expiration) {
//         testData.expiration = uint48(bound(expiration, block.timestamp, type(uint48).max));
//         _;
//     }

//     modifier whenExpirationIsInThePast(uint48 expiration) {
//         testData.expiration = uint48(bound(expiration, type(uint48).min + 1, block.timestamp));
//         _;
//     }

//     modifier whenExpirationIsCurrentTimestamp() {
//         testData.expiration = uint48(block.timestamp);
//         _;
//     }

//     modifier whenExpirationIsZero() {
//         testData.expiration = uint48(0);
//         _;
//     }

//     modifier whenTokenIsERC721() {
//         testData.token = _deployNew721(carol, 0);
//         _;
//     }

//     modifier whenTokenIsNotAContract(address token) {
//         assumeAddressIsNot(token, AddressType.ZeroAddress, AddressType.Precompile, AddressType.ForgeAddress);
//         vm.assume(token.code.length == 0);
//         testData.token = token;
//         _;
//     }

//     modifier whenTokenIsAnERC1155() {
//         testData.token = _deployNew1155(carol, 1, 1);
//         _mint1155(testData.token, testData.owner, testData.tokenId, testData.amount);
//         _;
//     }

//     modifier whenPositionIdIsNotZero(bytes32 positionId) {
//         vm.assume(positionId != bytes32(0));
//         testData.positionId = positionId;
//         _;
//     }

//     modifier whenPositionIdIsZero() {
//         testData.positionId = bytes32(0);
//         _;
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_base(uint48 expiration_, bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(expiration_)
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         changePrank(owner);
//         ERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(spender);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//         changePrank(admin);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_Expired(uint48 expiration_, bytes32 positionId_)
//      public
//      whenExpirationIsInThePast(expiration_)
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         changePrank(owner);
//         ERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_CurrentTimestamp(bytes32 positionId_)
//      public
//      whenExpirationIsCurrentTimestamp()
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         changePrank(owner);
//         ERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_ZeroTimestamp(bytes32 positionId_)
//      public
//      whenExpirationIsZero()
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         changePrank(owner);
//         ERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, uint48(block.timestamp), false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_WhenTokenIsNotContract(address token_, bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsNotAContract(token_)
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();

//         changePrank(owner);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(spender);
//         vm.expectRevert();
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_WhenTokenIsERC1155(bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsAnERC1155()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();

//         changePrank(owner);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(spender);
//         bool isError = permitC.transferFromERC721(token, owner, spender, tokenId, positionId);
//         assertTrue(isError);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_WhenPositionIdIsZero()
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsERC721()
//      whenPositionIdIsZero() {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         changePrank(owner);
//         IERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(spender);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_MultipleTokenIds(bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);
//         _mint721(token, owner, 2);
//         _mint721(token, owner, 3);

//         changePrank(owner);
//         IERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);
//         assertEq(permitC.allowance(owner, spender, token, tokenId + 1, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token, tokenId + 2, positionId), 0);

//         changePrank(spender);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token, tokenId + 1, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token, tokenId + 2, positionId), 0);

//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.transferFromERC721(token, owner, spender, tokenId + 1, positionId);
//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.transferFromERC721(token, owner, spender, tokenId + 2, positionId);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_MultipleTokens(bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         address token2 = _deployNew721(carol, 0);
//         _mint721(token2, owner, 1);

//         address token3 = _deployNew721(carol, 0);
//         _mint721(token3, owner, 1);

//         changePrank(owner);
//         IERC721(token).approve(address(permitC), tokenId);
//         IERC721(token2).approve(address(permitC), tokenId);
//         IERC721(token3).approve(address(permitC), tokenId);

//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         emit PositionApproval(owner, token2, spender, tokenId, positionId, amount, expiration, false, 0);
//         emit PositionApproval(owner, token3, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);
//         permitC.approve(token2, tokenId, spender, positionId, expiration);
//         permitC.approve(token3, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);
//         assertEq(permitC.allowance(owner, spender, token2, tokenId, positionId), amount);
//         assertEq(permitC.allowance(owner, spender, token3, tokenId, positionId), amount);

//         changePrank(spender);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token2, tokenId, positionId), amount);
//         assertEq(permitC.allowance(owner, spender, token3, tokenId, positionId), amount);

//         permitC.transferFromERC721(token2, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token2).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token2, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token3, tokenId, positionId), amount);

//         permitC.transferFromERC721(token3, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token3).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token2, tokenId, positionId), 0);
//         assertEq(permitC.allowance(owner, spender, token3, tokenId, positionId), 0);

//         vm.expectRevert(PermitC__ApprovalTransferExceededPermittedAmount.selector);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);
//         vm.expectRevert(PermitC__ApprovalTransferExceededPermittedAmount.selector);
//         permitC.transferFromERC721(token2, owner, spender, tokenId, positionId);
//         vm.expectRevert(PermitC__ApprovalTransferExceededPermittedAmount.selector);
//         permitC.transferFromERC721(token3, owner, spender, tokenId, positionId);

//         changePrank(admin);
//     }

//     function testIncreaseApprovalViaOnchainTx_ERC721_MultipleUsers(bytes32 positionId_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) = _cacheData();
//         _mint721(token, owner, 1);

//         address badActor = makeAddr("badActor");

//         changePrank(owner);
//         IERC721(token).approve(address(permitC), tokenId);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(owner, token, spender, tokenId, positionId, amount, expiration, false, 0);
//         permitC.approve(token, tokenId, spender, positionId, expiration);

//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(badActor);
//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), owner);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), amount);

//         changePrank(spender);
//         permitC.transferFromERC721(token, owner, spender, tokenId, positionId);

//         assertEq(ERC721(token).ownerOf(tokenId), spender);
//         assertEq(permitC.allowance(owner, spender, token, tokenId, positionId), 0);
//     }

//     function testIncreaseApprovalViaOnChainTx_ERC721_MultipleUsersWrongPosition(bytes32 positionId_, bytes32 positionId2_)
//      public
//      whenExpirationIsInTheFuture(uint48(block.timestamp))
//      whenTokenIsERC721()
//      whenPositionIdIsNotZero(positionId_) {
//         vm.assume(testData.positionId != positionId2_);
//         _mint721(testData.token, testData.owner, 1);
//         _mint721(testData.token, testData.owner, 2);

//         address secondSpender = makeAddr("secondSpender");

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId + 1);
        
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(testData.owner, testData.token, testData.spender, testData.tokenId, testData.positionId, testData.amount, testData.expiration, false, 0);
//         permitC.approve(testData.token, testData.tokenId, testData.spender, testData.positionId, testData.expiration);
//         vm.expectEmit(true, true, true, true);
//         emit PositionApproval(testData.owner, testData.token, secondSpender, testData.tokenId + 1, positionId2_, testData.amount, testData.expiration, false, 0);
//         permitC.approve(testData.token, testData.tokenId + 1, secondSpender, positionId2_, testData.expiration);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), testData.amount);
//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, positionId2_), 0);

//         assertEq(permitC.allowance(testData.owner, secondSpender, testData.token, testData.tokenId, testData.positionId), 0);
//         assertEq(permitC.allowance(testData.owner, secondSpender, testData.token, testData.tokenId + 1, positionId2_), testData.amount);

//         changePrank(secondSpender);
//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.transferFromERC721(testData.token, testData.owner, secondSpender, testData.tokenId, testData.positionId);

//         assertEq(ERC721(testData.token).ownerOf(testData.tokenId), testData.owner);
//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), testData.amount);

//         changePrank(testData.spender);
//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.transferFromERC721(testData.token, testData.owner, testData.spender, testData.tokenId, positionId2_);

//         assertEq(ERC721(testData.token).ownerOf(testData.tokenId), testData.owner);
//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), testData.amount);

//         permitC.transferFromERC721(testData.token, testData.owner, testData.spender, testData.tokenId, testData.positionId);

//         assertEq(ERC721(testData.token).ownerOf(testData.tokenId), testData.spender);
//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);

//         changePrank(secondSpender);
//         permitC.transferFromERC721(testData.token, testData.owner, secondSpender, testData.tokenId + 1, positionId2_);

//         assertEq(ERC721(testData.token).ownerOf(testData.tokenId + 1), secondSpender);
//         assertEq(permitC.allowance(testData.owner, secondSpender, testData.token, testData.tokenId + 1, positionId2_), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_base() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), testData.amount);

//         changePrank(testData.spender);
//         permitC.transferFromERC721(testData.token, testData.owner, testData.spender, testData.tokenId, testData.positionId);

//         assertEq(ERC721(testData.token).ownerOf(testData.tokenId), testData.spender);
//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//         changePrank(admin);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidSpender() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: address(0), 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidToken() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: address(0), 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidTokenId() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: 0, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidPositionId() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: bytes32("invalid ID"), 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidAmount() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: 0, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, 1, testData.spender, testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidNonce() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 1, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidExpiration() public whenTokenIsERC721() {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration + uint48(1), testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_InvalidExpiration(uint48 expiration_) public whenTokenIsERC721() whenExpirationIsInThePast(expiration_) {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);
        
//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         vm.expectRevert(PermitC__ApprovalTransferPermitExpiredOrUnset.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);

//         assertEq(permitC.allowance(testData.owner, testData.spender, testData.token, testData.tokenId, testData.positionId), 0);
//     }

//     function testIncreaseApprovalViaSignature_ERc721_UsedSignature() public whenTokenIsERC721() whenExpirationIsInTheFuture(uint48(block.timestamp)) {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);
        
//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration, 
//             tokenOwnerKey: aliceKey
//         }));

//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);
//         vm.expectRevert(PermitC__NonceAlreadyUsedOrRevoked.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);
//     } 

//     function testIncreaseApprovalViaSignature_ERC721_NonceRevoked() public whenTokenIsERC721() whenExpirationIsInTheFuture(uint48(block.timestamp)) {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);
        
//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender, 
//             token: testData.token, 
//             tokenId: testData.tokenId, 
//             positionId: testData.positionId, 
//             amount: testData.amount, 
//             nonce: 0, 
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration,
//             tokenOwnerKey: aliceKey
//         }));

//         permitC.invalidateUnorderedNonce(0);

//         vm.expectRevert(PermitC__NonceAlreadyUsedOrRevoked.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);
//     }

//     function testIncreaseApprovalViaSignature_ERC721_MasterNonceRevoked() public whenTokenIsERC721() whenExpirationIsInTheFuture(uint48(block.timestamp)) {
//         _mint721(testData.token, testData.owner, 1);

//         changePrank(testData.owner);
//         IERC721(testData.token).approve(address(permitC), testData.tokenId);

//         SignatureECDSA memory signedPermit = getSignature(SignatureDetails({
//             operator: testData.spender,
//             token: testData.token,
//             tokenId: testData.tokenId,
//             positionId: testData.positionId,
//             amount: testData.amount,
//             nonce: 0,
//             approvalExpiration: testData.expiration,
//             sigDeadline: testData.expiration,
//             tokenOwnerKey: aliceKey
//         }));

//         permitC.lockdown();

//         vm.expectRevert(PermitC__SignatureTransferInvalidSignature.selector);
//         permitC.updateApprovalBySignature(testData.token, testData.tokenId, 0, testData.amount, testData.spender,  testData.positionId, testData.expiration, testData.expiration, testData.owner, signedPermit);
//     }

//     function getSignature(SignatureDetails memory details) internal view returns (SignatureECDSA memory signedPermit) {
//         uint8 v;
//         bytes32 r;
//         bytes32 s;
//         {
//             bytes32 digest = ECDSA.toTypedDataHash(
//                 permitC.domainSeparatorV4(),
//                 keccak256(
//                     abi.encode(
//                         UPDATE_POSITION_APPROVAL_TYPEHASH,
//                         details.token,
//                         details.tokenId,
//                         details.positionId,
//                         details.amount,
//                         details.nonce,
//                         details.operator,
//                         details.approvalExpiration,
//                         details.sigDeadline,
//                         0
//                     )
//                 )
//             );

//             (v,r,s)= vm.sign(details.tokenOwnerKey, digest);
//         }

//         signedPermit = SignatureECDSA({r: r, s: s, v: v});
//     }

//     function _cacheData() internal view returns (address token, address owner, address spender, uint256 tokenId, uint208 amount, uint48 expiration, bytes32 positionId) {
//         token = testData.token;
//         owner = testData.owner;
//         spender = testData.spender;
//         tokenId = testData.tokenId;
//         amount = testData.amount;
//         expiration = testData.expiration;
//         positionId = testData.positionId;
//     }
// }