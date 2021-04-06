// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {IERC20} from "./IERC20.sol";

contract Dac {
    string public constant daoType = "DAC";

    string public name;

    string public symbol;

    address public currency;

    uint256 public constant maxTeammates = 1000;

    address[] public teammates;

    uint256 public constant maxTotalSupply = 1e12;

    uint256 public totalSupply;

    uint256 public constant decimals = 0;

    uint256 public governanceTokensPrice;

    bool public purchasePublic;

    bool public purchaseRuleFrozen;

    bool public halfToVote;

    bool public halfToVoteFrozen;

    bool public teammatesListFrozen = false;

    uint256 public votingDuration;

    bool public votingDurationFrozen;

    bool public mintable;

    bool public mintableFrozen;

    bool public burnable;

    bool public burnableFrozen;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    struct Voting {
        address contractAddress;
        bytes data;
        uint256 value;
        string comment;
        uint256 index;
        uint256 timestamp;
        bool isActivated;
        address[] signers;
    }

    Voting[] public votings;

    event VotingCreated(
        address contractAddress,
        bytes data,
        uint256 value,
        string comment,
        uint256 index,
        uint256 timestamp
    );

    event VotingSigned(uint256 index, address signer, uint256 timestamp);

    event VotingActivated(uint256 index, uint256 timestamp, bytes result);

    event Received(address, uint256);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    modifier teammatesOnly {
        bool isTeammate;

        for (uint256 i = 0; i < teammates.length; i++) {
            if (msg.sender == teammates[i]) {
                isTeammate = true;
                break;
            }
        }

        require(isTeammate);
        _;
    }

    modifier contractOnly {
        require(msg.sender == address(this));
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address[] memory _currencies,
        address _currency,
        address[] memory _teammates,
        uint256 _totalSupply,
        uint256 _governanceTokensPrice,
        bool _purchasePublic,
        bool _halfToVote,
        uint256 _votingDuration
    ) {
        // Token Name
        name = _name;

        // Token Symbol
        symbol = _symbol;

        // Currency to Buy governanceTokens

        // 0x2170Ed0880ac9A755fd29B2688956BD959F933F8  ETH
        // 0x55d398326f99059fF775485246999027B3197955  BUSD-T
        // 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c  WBNB
        // 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d  USDC
        // 0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3  DAI
        // 0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56  BUSD
        // 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c  BTCB
        // 0x53fe1e6171c4f7f927210bbf2d23c218e1eea08b  XDAO

        bool _validCurrency;

        for (uint256 i = 0; i < _currencies.length; i++) {
            if (_currency == _currencies[i]) {
                _validCurrency = true;
                break;
            }
        }

        require(_validCurrency);

        currency = _currency;

        // Teammates Setting
        require(_teammates.length <= maxTeammates, "Too Many Teammates");

        teammates = _teammates;

        // // Total Supply (P.S. decimals == 0)
        require(_totalSupply < maxTotalSupply, "Too Many governanceTokens");

        totalSupply = _totalSupply;

        // // governanceTokens Price
        governanceTokensPrice = _governanceTokensPrice;

        // // Who Can Buy governanceTokens (Teammates or Everyone)
        purchasePublic = _purchasePublic;

        // // Does it require that only Half of the Directors sign the transaction?
        halfToVote = _halfToVote;

        // // Duration of Voting
        require(
            _votingDuration == 2 hours || _votingDuration == 24 hours || _votingDuration == 72 hours,
            "Only 2 hours or 24 hours or 72 hours allowed"
        );

        votingDuration = _votingDuration;

        // Send All the governanceTokens to Organization
        balanceOf[address(this)] = _totalSupply;

        emit Transfer(address(0), address(this), _totalSupply);
    }

    function approve(address spender, uint256 amount) public returns (bool success) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) public returns (bool success) {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;

        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public returns (bool success) {
        balanceOf[sender] -= amount;
        allowance[sender][msg.sender] -= amount;
        balanceOf[recipient] += amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }

    function createVoting(
        address _contractAddress,
        bytes calldata _data,
        uint256 _value,
        string memory _comment
    ) public teammatesOnly returns (bool success) {
        address[] memory _signers;

        votings.push(
            Voting({
                contractAddress: _contractAddress,
                data: _data,
                value: _value,
                comment: _comment,
                index: votings.length,
                timestamp: block.timestamp,
                isActivated: false,
                signers: _signers
            })
        );

        emit VotingCreated(_contractAddress, _data, _value, _comment, votings.length - 1, block.timestamp);

        return true;
    }

    function signVoting(uint256 _index) public teammatesOnly returns (bool success) {
        // Didn't vote yet
        for (uint256 i = 0; i < votings[_index].signers.length; i++) {
            require(msg.sender != votings[_index].signers[i]);
        }

        // Time is not over
        require(block.timestamp <= votings[_index].timestamp + votingDuration);

        votings[_index].signers.push(msg.sender);

        emit VotingSigned(_index, msg.sender, block.timestamp);

        return true;
    }

    function activateVoting(uint256 _index) public {
        if (!halfToVote) {
            require(votings[_index].signers.length >= teammates.length);
        } else {
            if (teammates.length % 2 == 0) {
                require(votings[_index].signers.length > (teammates.length / 2));
            } else {
                require(votings[_index].signers.length >= ((teammates.length + 1) / 2));
            }
        }

        require(!votings[_index].isActivated);

        address _contractToCall = votings[_index].contractAddress;

        bytes storage _data = votings[_index].data;

        uint256 _value = votings[_index].value;

        (bool b, bytes memory result) = _contractToCall.call{value: _value}(_data);

        require(b);

        votings[_index].isActivated = true;

        emit VotingActivated(_index, block.timestamp, result);
    }

    function addTeammate(address _newTeammate) public contractOnly returns (bool success) {
        require(!teammatesListFrozen);

        for (uint256 i = 0; i < teammates.length; i++) {
            require(_newTeammate != teammates[i]);
        }

        teammates.push(_newTeammate);

        return true;
    }

    function removeTeammate(address _teammateToRemove) public contractOnly returns (bool success) {
        require(!teammatesListFrozen);

        bool _found;
        uint256 _index;

        for (uint256 i = 0; i < teammates.length; i++) {
            if (_teammateToRemove == teammates[i]) {
                _found = true;
                _index = i;
                break;
            }
        }

        require(_found);

        teammates[_index] = teammates[teammates.length - 1];

        teammates.pop();

        return true;
    }

    function transferOfRights(address _oldTeammate, address _newTeammate) public contractOnly returns (bool success) {
        require(!teammatesListFrozen);

        bool _found;
        uint256 _index;

        for (uint256 i = 0; i < teammates.length; i++) {
            if (_oldTeammate == teammates[i]) {
                _found = true;
                _index = i;
                break;
            }
        }

        require(_found);

        teammates[_index] = _newTeammate;

        return true;
    }

    function freezeTeammatesListFrozen() public contractOnly returns (bool success) {
        teammatesListFrozen = true;

        return true;
    }

    function changePurchasePublic(bool _purchasePublic) public contractOnly returns (bool success) {
        require(!purchaseRuleFrozen);
        purchasePublic = _purchasePublic;

        return true;
    }

    function freezePurchaseRuleFrozen() public contractOnly returns (bool success) {
        purchaseRuleFrozen = true;

        return true;
    }

    function changeHalfToVote(bool _halfToVote) public contractOnly returns (bool success) {
        require(!halfToVoteFrozen);

        halfToVote = _halfToVote;

        return true;
    }

    function freezeHalfToVoteFrozen() public contractOnly returns (bool success) {
        halfToVoteFrozen = true;

        return true;
    }

    function changeVotingDuration(uint256 _votingDuration) public contractOnly returns (bool success) {
        require(!votingDurationFrozen);

        require(
            _votingDuration == 2 hours || _votingDuration == 24 hours || _votingDuration == 72 hours,
            "Only 2 hours or 24 hours or 72 hours allowed"
        );

        votingDuration = _votingDuration;

        return true;
    }

    function freezeVotingDuration() public contractOnly returns (bool success) {
        votingDurationFrozen = true;

        return true;
    }

    function changeMintable(bool _mintable) public contractOnly returns (bool success) {
        require(!mintableFrozen);

        mintable = _mintable;

        return true;
    }

    function freezeMintableFrozen() public contractOnly returns (bool success) {
        mintableFrozen = true;

        return true;
    }

    function changeBurnable(bool _burnable) public contractOnly returns (bool success) {
        require(!burnableFrozen);

        burnable = _burnable;

        return true;
    }

    function freezeBurnableFrozen() public contractOnly returns (bool success) {
        burnableFrozen = true;

        return true;
    }

    function mint(uint256 _amount) public contractOnly returns (bool success) {
        require(mintable && totalSupply + _amount < maxTotalSupply);

        totalSupply += _amount;

        balanceOf[address(this)] += _amount;

        return true;
    }

    function buyGovernanceTokens(uint256 _amount) public payable returns (bool success) {
        if (!purchasePublic) {
            bool _isTeammate;

            for (uint256 i = 0; i < teammates.length; i++) {
                if (msg.sender == teammates[i]) {
                    _isTeammate = true;
                    break;
                }
            }

            require(_isTeammate);
        }

        if (currency == 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c) {
            uint256 _amountIfBoughtWithCoins = msg.value / governanceTokensPrice;

            balanceOf[msg.sender] += _amountIfBoughtWithCoins;

            balanceOf[address(this)] -= _amountIfBoughtWithCoins;
        } else {
            IERC20 _currency = IERC20(currency);

            _currency.transferFrom(msg.sender, address(this), _amount * governanceTokensPrice);

            balanceOf[msg.sender] += _amount;

            balanceOf[address(this)] -= _amount;
        }

        return true;
    }

    function burnGovernanceTokens(address[] memory _tokens) public returns (bool success) {
        require(burnable);

        uint256 share = (totalSupply - balanceOf[address(this)]) / balanceOf[msg.sender];

        payable(msg.sender).transfer(address(this).balance / share);

        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(this)) {
                IERC20 _tokenToSend = IERC20(_tokens[i]);

                _tokenToSend.transfer(msg.sender, _tokenToSend.balanceOf(address(this)) / share);
            }
        }

        totalSupply -= balanceOf[msg.sender];

        balanceOf[msg.sender] = 0;

        bool _found;
        uint256 _index;

        for (uint256 i = 0; i < teammates.length; i++) {
            if (msg.sender == teammates[i]) {
                _found = true;
                _index = i;
                break;
            }
        }

        if (_found) {
            teammates[_index] = teammates[teammates.length - 1];

            teammates.pop();
        }

        return true;
    }

    function getAllTeammates() public view returns (address[] memory) {
        return teammates;
    }

    function getAllVotings() public view returns (Voting[] memory) {
        return votings;
    }
}
