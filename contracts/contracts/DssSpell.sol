// SPDX-License-Identifier: MIT

pragma solidity =0.6.12;

import "../lib/dss-exec-lib/src/DssAction.sol";
import "../lib/dss-exec-lib/src/DssExec.sol";
import "../lib/dss-exec-lib/src/DssExecLib.sol";

interface VatLike {
    function suck(
        address,
        address,
        uint256
    ) external;
}

contract DssSpellAction is DssAction {
    string public constant override description =
        "2022-10-26 Change auction parameters";

    uint256 internal constant RAD = 10**45;

    function officeHours() public view override returns (bool) {
        return false;
    }

    function actions() public override {
        // sump [rad] 45 digits
        // Modify debt auction threshold
        DssExecLib.setDebtAuctionDAIAmount(100);
    }
}

contract DssSpell is DssExec {
    constructor()
        public
        DssExec(block.timestamp + 30 days, address(new DssSpellAction()))
    {}
}
