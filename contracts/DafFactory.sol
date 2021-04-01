// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import { Daf } from "./Daf.sol";

contract DafFactory {
	Daf[] public dafs;

	address[] public currencies;

	event DafCreated(Daf daf);

	constructor(address[] memory _currencies) {
		currencies = _currencies;
	}

	function create(
		string memory _name,
		string memory _symbol,
		address _currency,
		uint256 _totalSupply,
		uint256 _governanceTokensPrice,
		uint256 _percentToVote,
		uint256 _limitToBuy,
		uint256 _votingDuration
	) public {
		Daf daf =
			new Daf(
				_name,
				_symbol,
				currencies,
				_currency,
				msg.sender,
				_totalSupply,
				_governanceTokensPrice,
				_percentToVote,
				_limitToBuy,
				_votingDuration
			);

		dafs.push(daf);

		emit DafCreated(daf);
	}

	function getDafs() public view returns (Daf[] memory) {
		return dafs;
	}
}
