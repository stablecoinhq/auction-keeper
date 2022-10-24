pragma solidity =0.5.12;

import "./Interface.sol";

interface Token {
    function totalSupply() external view returns (uint);

    function balanceOf(address account) external view returns (uint);

    function transfer(address recipient, uint amount) external returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint);

    function approve(address spender, uint amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool);

    function mint(address target, uint rad) external;

    function move(
        address src,
        address dst,
        uint rad
    ) external;

    function burn(address target, uint rad) external;

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

contract MockDSToken is Token {
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    string public name = "DSToken";
    string public symbol = "DST";
    uint8 public decimals = 18;

    constructor() public {}

    function transfer(address recipient, uint amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function approve(address spender) external returns (bool) {
        allowance[msg.sender][spender] = uint(-1);
        emit Approval(msg.sender, spender, uint(-1));
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool) {
        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return true;
    }

    function move(
        address sender,
        address recipient,
        uint amount
    ) external {
        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function mint(address target, uint amount) external {
        balanceOf[target] += amount;
        totalSupply += amount;
        emit Transfer(address(0), target, amount);
    }

    function burn(address src, uint amount) external {
        balanceOf[src] -= amount;
        totalSupply -= amount;
        emit Transfer(src, address(0), amount);
    }
}
