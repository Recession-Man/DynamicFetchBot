Yes, you can customize the search input using data from your .env file and retrieve specific information related to a token swap, such as the pool address, authority, source, and destination accounts, using the SPL Token Swap method. Below, I'll guide you on how to implement this.

1. Setup: Load Environment Variables
First, make sure to load your environment variables from the .env file to get the contract address (which we'll assume is the address of the token you want to swap with SOL).

2. Fetching Pool Data Using SPL Token Swap Method
We will create a function to fetch pool data based on the contract address of the token you want to swap with SOL.

3. Querying and Retrieving Specific Data
You will query the Solana blockchain using the SPL Token Swap method and retrieve specific data required for performing the swap.
