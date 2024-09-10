require('dotenv').config();  // Load environment variables from .env file
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { performSwap, createTokenAccountIfNotExist } = require('./lib.js');
const fs = require('fs');
const path = require('path');

// Load configuration from environment variables
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const TOKEN_MINT_ADDRESS = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
const SWAP_SLIPPAGE = parseFloat(process.env.SWAP_SLIPPAGE);
const SWAP_AMOUNT = parseFloat(process.env.SWAP_AMOUNT) * 1e9;  // Convert to lamports
const MIN_AMOUNT_OUT = parseFloat(process.env.MIN_AMOUNT_OUT) * 1e9;

// Load the wallet from the JSON file
const walletPath = path.resolve('C:\\Users\\atswo\\wallet\\new_wallet.json');
const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

// Create a connection to the Solana cluster
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Function to buy the token using SOL
async function buyToken(amount) {
    console.log(`Buying token with ${amount / 1e9} SOL...`);
    await performSwap({
        connection,
        wallet,
        sourceMint: PublicKey.default,  // SOL's default public key
        destinationMint: TOKEN_MINT_ADDRESS,
        amount: amount,
        slippage: SWAP_SLIPPAGE,
        minimumAmountOut: MIN_AMOUNT_OUT,
    });
}

// Function to sell the token back to SOL
async function sellToken(percentage) {
    console.log(`Selling token back to SOL...`);

    const tokenAccount = await createTokenAccountIfNotExist(connection, wallet, TOKEN_MINT_ADDRESS);
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    const balance = accountInfo.value.amount;

    const amountToSell = Math.floor(balance * percentage);

    if (amountToSell === 0) {
        console.error('No tokens to sell or calculated sell amount is zero.');
        return;
    }

    await performSwap({
        connection,
        wallet,
        sourceMint: TOKEN_MINT_ADDRESS,
        destinationMint: PublicKey.default,
        amount: amountToSell,
        slippage: SWAP_SLIPPAGE,
        minimumAmountOut: MIN_AMOUNT_OUT,
    });
}

// Function to simulate a random delay between buys
function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
}

// Trading loop
async function tradingLoop() {
    while (true) {
        console.log('Starting a new trading cycle...');

        // Perform multiple buys with random delays
        for (let i = 0; i < 4; i++) {
            await buyToken(SWAP_AMOUNT);
            await randomDelay(10, 20);  // Random delay between 10 to 20 seconds
        }

        // Perform the sell
        await sellToken(0.99);  // Selling 99% of the token balance

        console.log(`Waiting 20 seconds before the next cycle...`);
        await new Promise(resolve => setTimeout(resolve, 20 * 1000));
    }
}

// Start the trading loop
tradingLoop().catch(err => console.error(err));
