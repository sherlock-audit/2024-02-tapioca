// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ComposableOFTCore.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ComposableProxyOFT is ComposableOFTCore {
    using SafeERC20 for IERC20;

    IERC20 internal immutable innerToken;

    constructor(address _lzEndpoint, address _proxyToken) ComposableOFTCore(_lzEndpoint) {
        innerToken = IERC20(_proxyToken);
    }

    function circulatingSupply() public view virtual override returns (uint256) {
        unchecked {
            return innerToken.totalSupply() - innerToken.balanceOf(address(this));
        }
    }

    function token() public view virtual override returns (address) {
        return address(innerToken);
    }

    function _debitFrom(address _from, uint16, bytes memory, uint256 _amount)
        internal
        virtual
        override
        returns (uint256)
    {
        require(_from == _msgSender(), "ComposableProxyOFT: owner is not send caller");
        uint256 before = innerToken.balanceOf(address(this));
        innerToken.safeTransferFrom(_from, address(this), _amount);
        return innerToken.balanceOf(address(this)) - before;
    }

    function _creditTo(uint16, address _toAddress, uint256 _amount) internal virtual override returns (uint256) {
        uint256 before = innerToken.balanceOf(_toAddress);
        innerToken.safeTransfer(_toAddress, _amount);
        return innerToken.balanceOf(_toAddress) - before;
    }
}
