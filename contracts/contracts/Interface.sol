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
