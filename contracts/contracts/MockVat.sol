pragma solidity =0.5.12;

import "./Interface.sol";

contract MockVat is VatLike {
    mapping(address => uint256) public dai; // [rad]
    uint256 public debt; // Total Dai Issued    [rad]
    uint256 public vice; // Total Unbacked Dai  [rad]
    mapping(address => uint256) public sin; // [rad]
    mapping(address => mapping(address => uint)) public can;

    function hope(address usr) external {
        can[msg.sender][usr] = 1;
    }

    constructor() public {}

    function sub(uint x, uint y) internal pure returns (uint z) {
        require((z = x - y) <= x);
    }

    function add(uint x, uint y) internal pure returns (uint z) {
        require((z = x + y) >= x);
    }

    function mint(address src, uint rad) external {
        dai[src] = add(dai[src], rad);
    }

    function move(
        address src,
        address dst,
        uint rad
    ) external {
        dai[src] = sub(dai[src], rad);
        dai[dst] = add(dai[dst], rad);
    }

    function suck(
        address u,
        address v,
        uint rad
    ) external {
        sin[u] = add(sin[u], rad);
        dai[v] = add(dai[v], rad);
        vice = add(vice, rad);
        debt = add(debt, rad);
    }
}
