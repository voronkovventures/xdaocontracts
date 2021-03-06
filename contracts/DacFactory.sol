// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {Dac} from "./Dac.sol";

contract DacFactory {
    Dac[] public dacs;

    address[] public currencies;

    event DacCreated(Dac dac);

    constructor(address[] memory _currencies) {
        currencies = _currencies;
    }

    function create(
        string memory _name,
        string memory _symbol,
        address _currency,
        address[] memory _teammates,
        uint256 _totalSupply,
        uint256 _governanceTokensPrice,
        bool _purchasePublic,
        bool _halfToVote,
        uint256 _votingDuration
    ) external {
        bool _validCurrency;

        for (uint256 i = 0; i < currencies.length; i++) {
            if (_currency == currencies[i]) {
                _validCurrency = true;
                break;
            }
        }

        require(_validCurrency);

        Dac dac =
            new Dac(
                _name,
                _symbol,
                _currency,
                _teammates,
                _totalSupply,
                _governanceTokensPrice,
                _purchasePublic,
                _halfToVote,
                _votingDuration
            );

        dacs.push(dac);

        emit DacCreated(dac);
    }

    function getDacs() external view returns (Dac[] memory) {
        return dacs;
    }
}
