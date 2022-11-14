// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity =0.5.12;

interface VatLike {
    function move(
        address src,
        address dst,
        uint wad
    ) external;

    function suck(
        address src,
        address dst,
        uint rad
    ) external;
}

interface GemLike {
    function mint(address target, uint amount) external;

    function move(
        address src,
        address dst,
        uint rad
    ) external;

    function burn(address target, uint amount) external;
}

interface DssChief {
    function live() external view returns (uint256);

    function launch() external;

    function slates(bytes32, uint256) external view returns (address);

    function votes(address) external view returns (bytes32);

    function approvals(address) external view returns (uint256);

    function deposits(address) external view returns (uint);

    function GOV() external view returns (address);

    function IOU() external view returns (address);

    function hat() external view returns (address);

    function MAX_YAYS() external view returns (uint256);

    function lock(uint256) external;

    function free(uint256) external;

    function etch(address[] calldata) external returns (bytes32);

    function vote(address[] calldata) external returns (bytes32);

    function vote(bytes32) external;

    function lift(address) external;

    function setOwner(address) external;

    function setAuthority(address) external;

    function isUserRoot(address) external view returns (bool);

    function setRootUser(address, bool) external;

    function _root_users(address) external view returns (bool);

    function _user_roles(address) external view returns (bytes32);

    function _capability_roles(address, bytes4) external view returns (bytes32);

    function _public_capabilities(address, bytes4) external view returns (bool);

    function getUserRoles(address) external view returns (bytes32);

    function getCapabilityRoles(address, bytes4)
        external
        view
        returns (bytes32);

    function isCapabilityPublic(address, bytes4) external view returns (bool);

    function hasUserRole(address, uint8) external view returns (bool);

    function canCall(
        address,
        address,
        bytes4
    ) external view returns (bool);

    function setUserRole(
        address,
        uint8,
        bool
    ) external;

    function setPublicCapability(
        address,
        bytes4,
        bool
    ) external;

    function setRoleCapability(
        uint8,
        address,
        bytes4,
        bool
    ) external;
}

// https://github.com/dapphub/ds-token/blob/master/src/token.sol
interface DsToken {
    function name() external view returns (bytes32);

    function symbol() external view returns (bytes32);

    function decimals() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function transfer(address, uint256) external returns (bool);

    function allowance(address, address) external view returns (uint256);

    function approve(address, uint256) external returns (bool);

    function approve(address) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function push(address, uint256) external;

    function pull(address, uint256) external;

    function move(
        address,
        address,
        uint256
    ) external;

    function mint(uint256) external;

    function mint(address, uint) external;

    function burn(uint256) external;

    function burn(address, uint) external;

    function setName(bytes32) external;

    function authority() external view returns (address);

    function owner() external view returns (address);

    function setOwner(address) external;

    function setAuthority(address) external;
}
