// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import { IERC20 } from "./IERC20.sol";

interface IPancakePair {
	function getReserves()
		external
		view
		returns (
			uint112 reserve0,
			uint112 reserve1,
			uint32 blockTimestampLast
		);
}

contract Minter {
	uint256 threeYearsLockExprired;

	address public immutable xdaoAddress; // xDAO Token Address 0x53fe1e6171c4f7f927210bbf2d23c218e1eea08b

	bool public blocked;

	uint256 public whenItWillUnlock;

	uint256 public previousLimit = 0;

	uint256 public currentLimit = 1e22; // 10000

	uint256 public bought = 0;

	constructor(address _xdaoAddress) {
		threeYearsLockExprired = block.timestamp + 156 weeks;

		xdaoAddress = _xdaoAddress;
	}

	function buyToken(address _currency, uint256 _amount)
		public
		payable
		returns (bool success)
	{
		if (blocked) {
			if (block.timestamp > whenItWillUnlock) {
				blocked = false;

				uint256 newLimit = currentLimit + previousLimit;

				previousLimit = currentLimit;

				currentLimit = newLimit;
			}
		}

		require(!blocked);

		require(bought + _amount <= currentLimit);

		// All these tokens have decimals = 18

		require(
			_currency == 0x2170Ed0880ac9A755fd29B2688956BD959F933F8 || // ETH
				_currency == 0x55d398326f99059fF775485246999027B3197955 || // BUSD-T
				_currency == 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c || // WBNB
				_currency == 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d || // USDC
				_currency == 0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3 || // DAI
				_currency == 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56 || // BUSD
				_currency == 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c // BTCB
		);

		IERC20 _xDAO = IERC20(xdaoAddress);

		uint256 _priceInCents =
			100100 - (2 * _xDAO.balanceOf(address(this)) - _amount) / 2800;

		uint256 _mustChargeValue;

		// stable 1$
		if (
			_currency == 0x55d398326f99059fF775485246999027B3197955 ||
			_currency == 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d ||
			_currency == 0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3 ||
			_currency == 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
		) {
			_mustChargeValue = (_amount * _priceInCents) / 100;

			IERC20 _tokenToGet = IERC20(_currency);

			_tokenToGet.transferFrom(
				msg.sender,
				address(this),
				_mustChargeValue
			);
		}
		// ETH
		else if (_currency == 0x2170Ed0880ac9A755fd29B2688956BD959F933F8) {
			address _ethbusd = 0xd9A0d1F5e02dE2403f68Bb71a15F8847A854b494;

			IPancakePair _pair = IPancakePair(_ethbusd);

			(uint112 _reserveETH, uint112 _reserveBUSD, ) = _pair.getReserves();

			_mustChargeValue =
				(_amount * _priceInCents * _reserveETH) /
				(100 * _reserveBUSD);

			IERC20 _eth = IERC20(_currency);

			_eth.transferFrom(msg.sender, address(this), _mustChargeValue);
		}
		// WBNB
		else if (_currency == 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) {
			address _wbnbbusd = 0x1B96B92314C44b159149f7E0303511fB2Fc4774f;

			IPancakePair _pair = IPancakePair(_wbnbbusd);

			(uint112 _reserveWBNB, uint112 _reserveBUSD, ) =
				_pair.getReserves();

			_mustChargeValue =
				(_amount * _priceInCents * _reserveWBNB) /
				(100 * _reserveBUSD);

			require(msg.value >= _mustChargeValue);
		}
		// BTCB
		else if (_currency == 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c) {
			address _btcbbusd = 0xb8875e207EE8096a929D543C9981C9586992eAcb;

			IPancakePair _pair = IPancakePair(_btcbbusd);

			(uint112 _reserveBTCB, uint112 _reserveBUSD, ) =
				_pair.getReserves();

			_mustChargeValue =
				(_amount * _priceInCents * _reserveBTCB) /
				(100 * _reserveBUSD);

			IERC20 _btcb = IERC20(_currency);

			_btcb.transferFrom(msg.sender, address(this), _mustChargeValue);
		} else {
			revert();
		}

		_xDAO.transfer(msg.sender, _amount);

		bought += _amount;

		if (currentLimit - bought < 1e18) {
			blocked = true;

			whenItWillUnlock = block.timestamp + 30 days;
		}

		return true;
	}

	function reverseConversion(uint256 _amount) public returns (bool success) {
		require(block.timestamp >= threeYearsLockExprired);

		IERC20 _xDAO = IERC20(xdaoAddress);

		uint256 _share =
			((_xDAO.totalSupply() -
				_xDAO.balanceOf(address(this)) +
				_xDAO.balanceOf(msg.sender)) * 20) /
				_xDAO.balanceOf(msg.sender) /
				19; // share^-1

		_xDAO.transferFrom(msg.sender, address(this), _amount);

		IERC20 _eth = IERC20(0x2170Ed0880ac9A755fd29B2688956BD959F933F8);

		_eth.transfer(msg.sender, _eth.balanceOf(address(this)) / _share);

		IERC20 _busdt = IERC20(0x55d398326f99059fF775485246999027B3197955);

		_busdt.transfer(msg.sender, _busdt.balanceOf(address(this)) / _share);

		payable(msg.sender).transfer(address(this).balance / _share);

		IERC20 _usdc = IERC20(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d);

		_usdc.transfer(msg.sender, _usdc.balanceOf(address(this)) / _share);

		IERC20 _dai = IERC20(0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3);

		_dai.transfer(msg.sender, _dai.balanceOf(address(this)) / _share);

		IERC20 _busd = IERC20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56);

		_busd.transfer(msg.sender, _busd.balanceOf(address(this)) / _share);

		IERC20 _btcb = IERC20(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);

		_btcb.transfer(msg.sender, _btcb.balanceOf(address(this)) / _share);

		bought -= _amount;

		return true;
	}
}
