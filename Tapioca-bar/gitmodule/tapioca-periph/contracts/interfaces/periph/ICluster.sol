// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

interface ICluster {
    function isWhitelisted(uint32 lzChainId, address _addr) external view returns (bool);

    function updateContract(uint32 lzChainId, address _addr, bool _status) external;

    function batchUpdateContracts(uint32 _lzChainId, address[] memory _addresses, bool _status) external;

    function lzChainId() external view returns (uint32);

    function hasRole(address _contract, bytes32 _role, address _target) external view returns (bool);
}
