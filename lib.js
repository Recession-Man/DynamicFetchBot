const { PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const { TokenSwap } = require('@solana/spl-token-swap');
const { Buffer } = require('buffer');

// Function to create an associated token account if it doesn't exist
async function createTokenAccountIfNotExist(connection, wallet, mint) {
    const tokenAccount = await splToken.getAssociatedTokenAddress(
        mint,
        wallet.publicKey,
        true,
        splToken.TOKEN_PROGRAM_ID,
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(tokenAccount);
    if (!accountInfo) {
        const transaction = new Transaction().add(
            splToken.createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                tokenAccount,
                wallet.publicKey,
                mint,
                splToken.TOKEN_PROGRAM_ID,
                splToken.ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );

        await sendAndConfirmTransaction(connection, transaction, [wallet]);
        console.log(`Created token account for mint: ${mint.toString()} at ${tokenAccount.toString()}`);
    } else {
        console.log(`Token account already exists at ${tokenAccount.toString()} for mint: ${mint.toString()}`);
    }
    return tokenAccount;
}

// Function to fetch all relevant pools from the Solana blockchain
async function fetchAllPools(connection) {
    // Replace this with the actual Token Swap Program ID you are using
    const programId = new PublicKey('SPL_Token_Swap_Program_ID_Here');

    // Example: Fetching all program accounts related to token swaps
    const pools = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: 324 }, // Typical size for a token swap pool account
        ],
    });

    // Parse and return the pool data
    return pools.map(pool => {
        const data = TokenSwap.decode(pool.account.data);
        return {
            baseMint: data.tokenAccountA, // Mint of the first token
            quoteMint: data.tokenAccountB, // Mint of the second token
            address: pool.pubkey,
            authority: data.authority,
            poolSource: data.tokenAccountA,
            poolDestination: data.tokenAccountB,
            poolFeeAccount: data.poolFeeAccount,
        };
    });
}

// Function to get pool address based on token mints
async function getPoolAddress(connection, sourceMint, destinationMint) {
    const pools = await fetchAllPools(connection);

    const pool = pools.find(p => 
        (p.baseMint.equals(sourceMint) && p.quoteMint.equals(destinationMint)) ||
        (p.baseMint.equals(destinationMint) && p.quoteMint.equals(sourceMint))
    );

    if (!pool) {
        throw new Error('No matching pool found for the given token pair');
    }

    return pool.address;
}

// Function to get pool authority
async function getPoolAuthority(connection, sourceMint, destinationMint) {
    const pools = await fetchAllPools(connection);
    const pool = pools.find(p => 
        (p.baseMint.equals(sourceMint) && p.quoteMint.equals(destinationMint)) ||
        (p.baseMint.equals(destinationMint) && p.quoteMint.equals(sourceMint))
    );
    if (!pool) throw new Error('No matching pool found');
    return pool.authority;
}

// Function to get pool source account
async function getPoolSource(connection, sourceMint, destinationMint) {
    const pools = await fetchAllPools(connection);
    const pool = pools.find(p => 
        (p.baseMint.equals(sourceMint) && p.quoteMint.equals(destinationMint)) ||
        (p.baseMint.equals(destinationMint) && p.quoteMint.equals(sourceMint))
    );
    if (!pool) throw new Error('No matching pool found');
    return pool.poolSource;
}

// Function to get pool destination account
async function getPoolDestination(connection, sourceMint, destinationMint) {
    const pools = await fetchAllPools(connection);
    const pool = pools.find(p => 
        (p.baseMint.equals(sourceMint) && p.quoteMint.equals(destinationMint)) ||
        (p.baseMint.equals(destinationMint) && p.quoteMint.equals(sourceMint))
    );
    if (!pool) throw new Error('No matching pool found');
    return pool.poolDestination;
}

// Function to get pool fee account
async function getPoolFeeAccount(connection, sourceMint, destinationMint) {
    const pools = await fetchAllPools(connection);
    const pool = pools.find(p => 
        (p.baseMint.equals(sourceMint) && p.quoteMint.equals(destinationMint)) ||
        (p.baseMint.equals(destinationMint) && p.quoteMint.equals(sourceMint))
    );
    if (!pool) throw new Error('No matching pool found');
    return pool.poolFeeAccount;
}

// Function to perform a token swap between SOL and the SPL token
async function performSwap({ connection, wallet, sourceMint, destinationMint, amount, slippage, minimumAmountOut }) {
    const poolAddress = await getPoolAddress(connection, sourceMint, destinationMint);
    const authority = await getPoolAuthority(connection, sourceMint, destinationMint);
    const poolSource = await getPoolSource(connection, sourceMint, destinationMint);
    const poolDestination = await getPoolDestination(connection, sourceMint, destinationMint);
    const poolFeeAccount = await getPoolFeeAccount(connection, sourceMint, destinationMint);

    const transaction = new Transaction().add(
        TokenSwap.swapInstruction(
            {
                tokenSwap: poolAddress,
                authority: authority,
                userTransferAuthority: wallet.publicKey,
                source: await createTokenAccountIfNotExist(connection, wallet, sourceMint),
                destination: await createTokenAccountIfNotExist(connection, wallet, destinationMint),
                poolSource: poolSource,
                poolDestination: poolDestination,
                poolFeeAccount: poolFeeAccount,
                tokenProgramId: splToken.TOKEN_PROGRAM_ID,
                amountIn: amount,
                minimumAmountOut: minimumAmountOut,
            },
            new PublicKey('SPL_Token_Swap_Program_ID_Here') // Replace with the actual Token Swap Program ID
        )
    );

    try {
        const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
        console.log(`Swap executed successfully: ${signature}`);
    } catch (error) {
        console.error(`Swap failed: ${error}`);
    }
}

module.exports = {
    performSwap,
    createTokenAccountIfNotExist,
    getPoolAddress,
    getPoolAuthority,
    getPoolSource,
    getPoolDestination,
    getPoolFeeAccount,
};
