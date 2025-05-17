import { config } from 'dotenv';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { erc20ABI } from '../abis/erc20ABI.mjs';
import { tokenHomeABI } from '../abis/tokenHomeABI.mjs';  
import { teleporterRegistryABI } from '../abis/teleporterRegistryABI.mjs';
import { tokenRemoteABI } from '../abis/TokenRemoteABI.mjs';
 
// Load environment variables
config();

export class AvalancheSDK {
    /**
     * Initializes a new instance of the AvalancheSDK.
     * Reads the PRIVATE_KEY from the .env file and throws an error if not set.
     */
    constructor() {
        this.privateKey = process.env.PRIVATE_KEY;
        if (!this.privateKey) throw new Error('Set PRIVATE_KEY in your .env file');
    }

    /**
     * Creates and initializes a wallet client for a specified chain.
     * @param {object} chainObject - The chain configuration object (e.g., from viem/chains).
     * @returns {Promise<object>} A promise that resolves to the account object derived from the private key.
     * @throws {Error} If the private key is not set.
     */
    async createAccount(chainObject) {
        const account = privateKeyToAccount(this.privateKey)

        this.walletClient = createWalletClient({
          account: account,
          chain: chainObject,
          transport: http(chainObject.rpcUrls.default.http[0]),
        });

        return account;
    }

    /**
     * Deploys a new ERC20 token contract.
     * @param {object} params - Parameters for the ERC20 token.
     * @param {string} params.name - The name of the token.
     * @param {string} params.symbol - The symbol of the token.
     * @param {number} params.totalSupply - The total supply of the token (will be converted to Wei, assuming 18 decimals).
     * @returns {Promise<object>} A promise that resolves to an object containing the contract address and a wait function for the transaction receipt.
     * @throws {Error} If the wallet client is not initialized or if the deployment fails.
     */
    async createErc20({ name, symbol, totalSupply }) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }

        console.log(`Deploying ${name} (${symbol}) with initial supply ${totalSupply}...`);

        // Assuming 18 decimals for the token
        const initialSupplyWei = BigInt(totalSupply) * 10n ** 18n;

        const hash = await this.walletClient.deployContract({
            abi: erc20ABI.abi,
            bytecode: erc20ABI.bytecode,
            args: [name, symbol, initialSupplyWei, this.walletClient.account.address],
        });

        console.log("address", this.walletClient.account.address);
        console.log('Deployment transaction hash:', hash);
        console.log('Waiting for transaction receipt...');

        const publicClient = createPublicClient({
            chain: this.walletClient.chain,
            transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success' && receipt.contractAddress) {
            console.log('Contract deployed successfully! Contract address:', receipt.contractAddress);
            return {
                address: receipt.contractAddress,
                wait: async () => receipt,
            };
        } else {
            console.error('Deployment failed:', receipt);
            throw new Error(`Contract deployment failed. Status: ${receipt.status}`);
        }
    }

    /**
     * Fetches the name, symbol, and decimals for an ERC20 token.
     * @param {object} publicClient - The public client for the chain where the ERC20 token resides.
     * @param {`0x${string}`} tokenAddress - The address of the ERC20 token.
     * @returns {Promise<{name: string, symbol: string, decimals: number}>} An object with token details.
     * @throws {Error} If details cannot be fetched.
     * @private
     */
    async _getErc20Details(publicClient, tokenAddress) {
        try {
            console.log(`Fetching details for ERC20 token at ${tokenAddress} on ${publicClient.chain.name}...`);
            const name = await publicClient.readContract({
                address: tokenAddress,
                abi: erc20ABI.abi,
                functionName: 'name',
            });
            const symbol = await publicClient.readContract({
                address: tokenAddress,
                abi: erc20ABI.abi,
                functionName: 'symbol',
            });
            const decimals = await publicClient.readContract({
                address: tokenAddress,
                abi: erc20ABI.abi,
                functionName: 'decimals',
            });
            console.log(`Fetched ERC20 Details: Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
            return { name, symbol, decimals };
        } catch (readError) {
            console.error(`Error fetching ERC20 details from ${tokenAddress} on ${publicClient.chain.name}:`, readError);
            throw new Error(`Could not fetch ERC20 details (name, symbol, decimals) for token ${tokenAddress}. Ensure it is a valid ERC20 contract and the chain is reachable.`);
        }
    }

    /**
     * Transfers ERC20 tokens, performing approval and then sending them via Teleporter's TokenHome.
     * @param {string} tokenAddress - The address of the ERC20 token to transfer.
     * @param {string} recipient - The recipient address on the destination chain.
     * @param {string} amount - The amount of tokens to transfer (in full token units, e.g., "1" for 1 token).
     * @param {string} tokenHome - The address of the TokenHome contract on the source chain.
     * @param {string} tokenRemote - The address of the TokenRemote contract on the destination chain (used as destinationTokenTransferrerAddress).
     * @param {bigint} gasLimit - The gas limit for the transactions.
     * @param {string} feeReceiver - The address to receive fees for the Teleporter transaction.
     * @param {string} destinationChainId - The blockchain ID of the destination chain for the Teleporter message.
     * @returns {Promise<object>} A promise that resolves to an object containing success status, approveTxHash, and sendTxHash.
     * @throws {Error} If the wallet client is not initialized or if any transaction fails.
     */
    async transferTokens(tokenAddress, recipient, amount, tokenHome, tokenRemote, gasLimit, feeReceiver, destinationChainId) {
   
        // Ensure amount is a string for parseUnits
        const amountAsString = typeof amount === 'number' ? String(amount) : amount;
        const amountInWei = parseUnits(amountAsString, 18);
    
        console.log("Amount in Wei:", amountInWei.toString());
        console.log("Amount in Token Units:", Number(amountInWei) / 10**18);
    
        console.log("Checking token balance before transfer...");
        
        // Create public client for transaction receipt and balance check
        const publicClient = createPublicClient({
            chain: this.walletClient.chain,
            transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
        });
        
        // Check token balance
        const balance = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20ABI.abi,
            functionName: "balanceOf",
            args: [this.walletClient.account.address],
        });
        console.log("Account balance for token", tokenAddress, ":", balance.toString(), "Wei");
        console.log("Account balance in Token Units:", Number(balance) / 10**18);
        if (balance < amountInWei) {
            console.error("Insufficient token balance for transfer. Required:", amountInWei.toString(), "Wei");
            console.error("Required in Token Units:", Number(amountInWei) / 10**18);
            console.error("Send", Number(amountInWei) / 10**18, "units of token", tokenAddress, "to wallet address", this.walletClient.account.address, "to proceed with the transfer.");
            return {
                success: false,
                error: "Insufficient token balance for transfer.",
                approveTxHash: null,
                sendTxHash: null
            };
        }
        
        console.log("Approving tokens for transfer...");
        
        // Approve tokens for transfer
        const approveTxHash = await this.walletClient.writeContract({
          address: tokenAddress,
          abi: erc20ABI.abi,
          functionName: "approve",
          args: [tokenHome, amountInWei],
          gasLimit
        });
    
        console.log("Approve transaction hash:", approveTxHash);
    
        // Wait for the approval transaction to be mined
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        // console.log("Approval transaction mined:", approveReceipt);
    
        const sendTokensInput = {
          destinationBlockchainID: destinationChainId,
          destinationTokenTransferrerAddress: tokenRemote,
          recipient,
          primaryFeeTokenAddress: tokenAddress,
          primaryFee: 0n,
          secondaryFee: 0n,
          requiredGasLimit: 250000n,
          multiHopFallback: '0x0000000000000000000000000000000000000000',
        };

        console.log("Sending tokens cross-chain...");
        console.log(sendTokensInput);
    
        // Send tokens cross-chain
        const sendTxHash = await this.walletClient.writeContract({
          address: tokenHome,
          abi: tokenHomeABI.abi,
          functionName: 'send',
          args: [sendTokensInput, amountInWei],
          gasLimit: 5000000n
        });
    
         // Wait for the send transaction to be mined
         const sendReceipt = await publicClient.waitForTransactionReceipt({ hash: sendTxHash });
        //  console.log("Send transaction mined:", sendReceipt);
    
        return {
            success: true,
            approveTxHash,
            sendTxHash,
        };
      }

      /**
       * Deploys a TeleporterRegistry contract.
       * @param {Array<object>} [initialEntries=[]] - Optional initial entries for the registry.
       * @returns {Promise<object>} A promise that resolves to an object containing the contract address and a wait function.
       * @throws {Error} If the wallet client is not initialized or if the deployment fails.
       */
      async deployTeleporterRegistry(initialEntries = []) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }
        
        console.log('Deploying Teleporter Registry contract...');
        
        const hash = await this.walletClient.deployContract({
            abi: teleporterRegistryABI.abi,
            bytecode: teleporterRegistryABI.bytecode, // Assuming bytecode will be added to teleporterRegistryABI.mjs
            args: [initialEntries], // Pass initial entries if any
        });
        
        console.log('Deployment transaction hash:', hash);
        console.log('Waiting for transaction receipt...');
        
        const publicClient = createPublicClient({
            chain: this.walletClient.chain,
            transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
        });
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success' && receipt.contractAddress) {
            console.log('Teleporter Registry contract deployed successfully! Contract address:', receipt.contractAddress);
            return {
                address: receipt.contractAddress,
                wait: async () => receipt,
            };
        } else {
            console.error('Deployment failed:', receipt);
            throw new Error(`Teleporter Registry contract deployment failed. Status: ${receipt.status}`);
        }
      }

      /**
       * Initializes a TeleporterRegistry contract by calling its `initializeBlockchainID` function.
       * @param {string} registryAddress - The address of the TeleporterRegistry contract.
       * @returns {Promise<object>} A promise that resolves to the transaction receipt, or an object indicating it was already initialized.
       * @throws {Error} If the wallet client is not initialized or if the initialization transaction fails (unless already initialized).
       */
      async initializeTeleporterRegistry(registryAddress) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }
        
        console.log(`Initializing TeleporterRegistry at ${registryAddress}...`);
        
        try {
            // Call initializeBlockchainID function on the registry
            const hash = await this.walletClient.writeContract({
                address: registryAddress,
                abi: teleporterRegistryABI.abi,
                functionName: 'initializeBlockchainID',
                args: []
            });
            
            console.log('Initialization transaction hash:', hash);
            console.log('Waiting for transaction receipt...');
            
            const publicClient = createPublicClient({
                chain: this.walletClient.chain,
                transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
            });
            
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            
            if (receipt.status === 'success') {
                console.log('TeleporterRegistry initialized successfully!');
                return receipt;
            } else {
                console.error('Initialization failed:', receipt);
                throw new Error(`TeleporterRegistry initialization failed. Status: ${receipt.status}`);
            }
        } catch (error) {
            if (error.message.includes('already initialized')) {
                console.log('TeleporterRegistry already initialized.');
                return { status: 'success', alreadyInitialized: true };
            }
            throw error;
        }
      }
      
      /**
       * Deploys a TokenHome contract.
       * @param {string} registryAddr - The address of the TeleporterRegistry contract.
       * @param {string} managerAddr - The address of the Teleporter manager for this TokenHome.
       * @param {string|number} minVersion - The minimum Teleporter version required.
       * @param {string} erc20Addr - The address of the ERC20 token this TokenHome will manage.
       * @param {number} [erc20Decimals=18] - The decimals of the ERC20 token.
       * @returns {Promise<object>} A promise that resolves to an object containing the contract address and a wait function.
       * @throws {Error} If the wallet client is not initialized, bytecode is missing, or deployment fails.
       */
      async deployTokenHome(registryAddr, managerAddr, minVersion, erc20Addr, erc20Decimals = 18) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }
        
        console.log(`Deploying TokenHome for token: ${erc20Addr}`);
        console.log('Using Teleporter Registry Address:', registryAddr);
        console.log('Using Teleporter Manager Address:', managerAddr);
        console.log('Using Min Teleporter Version:', minVersion);
        console.log('ERC20 Token Address to use:', erc20Addr);
        console.log('ERC20 Token Decimals to use:', erc20Decimals);
        
        // Check if bytecode exists in tokenHomeABI
        if (!tokenHomeABI.bytecode) {
            throw new Error('Bytecode for TokenHome contract is not defined in tokenHomeABI.mjs. Please update the file with the correct bytecode.');
        }
        
        console.log('Bytecode for TokenHome contract found. Proceeding with deployment...');
        
        try {
            const finalDecimalsArg = Number(erc20Decimals);
            const finalMinVersionArg = BigInt(minVersion);

            const hash = await this.walletClient.deployContract({
                abi: tokenHomeABI.abi,
                bytecode: tokenHomeABI.bytecode, 
                args: [registryAddr, managerAddr, finalMinVersionArg, erc20Addr, finalDecimalsArg],
            });
            
            console.log('Deployment transaction hash:', hash);
            console.log('Waiting for transaction receipt...');
            
            const publicClient = createPublicClient({
                chain: this.walletClient.chain,
                transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
            });
            
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            
            if (receipt.status === 'success' && receipt.contractAddress) {
                console.log('TokenHome contract deployed successfully! Contract address:', receipt.contractAddress);
                return {
                    address: receipt.contractAddress,
                    wait: async () => receipt,
                };
            } else {
                console.error('Deployment failed with receipt:', receipt);
                throw new Error(`TokenHome contract deployment failed. Status: ${receipt.status}`);
            }
        } catch (error) {
            console.error('Error during TokenHome deployment:', error.message);
            console.error('Full error object:', error);
            throw new Error(`TokenHome deployment failed: ${error.message}`);
        }
      } 
      
      
      /**
       * Deploys a TokenRemote contract.
       * @param {object} settings - Settings for the TokenRemote contract.
       * @param {string} settings.teleporterRegistryAddress - Address of the TeleporterRegistry on the destination chain.
       * @param {string} settings.teleporterManager - Manager address for this TokenRemote.
       * @param {string|number} settings.minTeleporterVersion - Minimum Teleporter version.
       * @param {string} settings.tokenHomeBlockchainID - Blockchain ID of the chain where TokenHome resides.
       * @param {string} settings.tokenHomeAddress - Address of the TokenHome contract.
       * @param {number} settings.tokenHomeDecimals - Decimals of the token on its home chain.
       * @param {string} tokenName - The name for the ERC20 representation on the remote chain.
       * @param {string} tokenSymbol - The symbol for the ERC20 representation on the remote chain.
       * @param {number} tokenDecimals_for_erc20 - The decimals for this TokenRemote's own ERC20 representation.
       * @returns {Promise<object>} A promise that resolves to an object containing the contract address and a wait function.
       * @throws {Error} If the wallet client is not initialized, ABI/bytecode is missing, or deployment fails.
       */
      async deployTokenRemote(settings, tokenName, tokenSymbol, tokenDecimals_for_erc20) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }
        
        console.log(`Deploying TokenRemote ${tokenSymbol} for ${tokenName}...`);
        console.log('Settings for TokenRemote:', settings);
        console.log('ERC20 Name for TokenRemote:', tokenName);
        console.log('ERC20 Symbol for TokenRemote:', tokenSymbol);
        console.log('ERC20 Decimals for TokenRemote:', tokenDecimals_for_erc20);

        // Construct the arguments array for the ERC20TokenRemote constructor
        const constructorArgs = [
            { // settings tuple
                teleporterRegistryAddress: settings.teleporterRegistryAddress,
                teleporterManager: settings.teleporterManager,
                minTeleporterVersion: BigInt(settings.minTeleporterVersion),
                tokenHomeBlockchainID: settings.tokenHomeBlockchainID,
                tokenHomeAddress: settings.tokenHomeAddress,
                tokenHomeDecimals: Number(settings.tokenHomeDecimals), // uint8
            },
            tokenName,     // string
            tokenSymbol,   // string
            Number(tokenDecimals_for_erc20) // uint8 for the remote ERC20's own decimals
        ];

        if (!tokenRemoteABI || !tokenRemoteABI.bytecode || !tokenRemoteABI.abi) {
            throw new Error('ABI and/or Bytecode for TokenRemote contract is not defined in TokenRemoteABI.mjs.');
        }

        console.log('Bytecode and ABI for TokenRemote found. Proceeding with deployment...');

        try {
            const hash = await this.walletClient.deployContract({
                abi: tokenRemoteABI.abi,
                bytecode: tokenRemoteABI.bytecode,
                args: constructorArgs,
            });

            console.log('TokenRemote deployment transaction hash:', hash);
            console.log('Waiting for transaction receipt...');

            const publicClient = createPublicClient({
                chain: this.walletClient.chain,
                transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'success' && receipt.contractAddress) {
                console.log('TokenRemote contract deployed successfully! Contract address:', receipt.contractAddress);
                return {
                    address: receipt.contractAddress,
                    wait: async () => receipt,
                };
            } else {
                console.error('TokenRemote deployment failed with receipt:', receipt);
                throw new Error(`TokenRemote contract deployment failed. Status: ${receipt.status}`);
            }
        } catch (error) {
            console.error('Error during TokenRemote deployment:', error.message);
            console.error('Full error object:', error);
            throw new Error(`TokenRemote deployment failed: ${error.message}`);
        }
      }

      /**
       * Calls the `registerWithHome` function on a TokenRemote contract.
       * This function is typically called on the destination chain to register the TokenRemote with its corresponding TokenHome.
       * @param {string} tokenRemoteAddress - The address of the TokenRemote contract.
       * @param {string} [feeTokenAddress=\'0x000...\'] - The address of the token to pay fees in for the registration message.
       * @param {bigint} [feeAmount=0n] - The amount of fee tokens to pay.
       * @param {bigint} [gasLimit=250000n] - The gas limit for the transaction.
       * @returns {Promise<object>} A promise that resolves to the transaction receipt.
       * @throws {Error} If the wallet client is not initialized, ABI is missing, or the transaction fails.
       */
      async registerWithHome(tokenRemoteAddress, feeTokenAddress = '0x0000000000000000000000000000000000000000', feeAmount = 0n, gasLimit = 250000n) {
        if (!this.walletClient) {
            throw new Error('Wallet client not initialized. Call createAccount first.');
        }

        console.log(`Calling registerWithHome on TokenRemote: ${tokenRemoteAddress}`);
        const feeInfo = [feeTokenAddress, feeAmount];
        console.log('Using feeInfo:', feeInfo);

        if (!tokenRemoteABI || !tokenRemoteABI.abi) {
            throw new Error('ABI for TokenRemote contract is not defined in TokenRemoteABI.mjs.');
        }

        try {
            const hash = await this.walletClient.writeContract({
                address: tokenRemoteAddress,
                abi: tokenRemoteABI.abi,
                functionName: 'registerWithHome',
                args: [feeInfo],
                gasLimit: gasLimit,
            });

            console.log('registerWithHome transaction hash:', hash);
            console.log('Waiting for transaction receipt...');

            const publicClient = createPublicClient({
                chain: this.walletClient.chain,
                transport: http(this.walletClient.chain.rpcUrls.default.http[0]),
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'success') {
                console.log('registerWithHome transaction successful!', receipt);
                return receipt;
            } else {
                console.error('registerWithHome transaction failed with receipt:', receipt);
                throw new Error(`registerWithHome transaction failed. Status: ${receipt.status}`);
            }
        } catch (error) {
            console.error('Error during registerWithHome call:', error.message);
            console.error('Full error object:', error);
            throw new Error(`registerWithHome call failed: ${error.message}`);
        }
      }

      /**
       * Orchestrates the full end-to-end process of bridging an ERC20 token from a source chain to a destination L1 chain.
       * This involves:
       * 1. Setting up accounts on both chains.
       * 2. Fetching ERC20 details (name, symbol, decimals) from the source chain contract.
       * 3. Deploying TokenHome on the source chain.
       * 4. Deploying TokenRemote on the destination chain.
       * 5. Registering TokenRemote with TokenHome.
       * 6. Transferring tokens from source to destination.
       * Assumes the ERC20 token is already deployed on the source chain.
       * @param {object} sourceChainConfig - Configuration object for the source chain.
       * @param {object} destinationChainConfig - Configuration object for the destination L1 chain.
       * @param {string} homeErc20Address - The address of the pre-deployed ERC20 token on its home (source) chain.
       * @param {object} teleporterAddresses - Addresses for TeleporterRegistry contracts.
       * @param {string} teleporterAddresses.sourceRegistry - TeleporterRegistry address on the source chain.
       * @param {string} teleporterAddresses.destinationRegistry - TeleporterRegistry address on the destination chain.
       * @param {string} recipient - The recipient address on the destination chain.
       * @param {string} amount - Amount of tokens to transfer (e.g., "1" for 1 token).
       * @param {object} [transferOptions={}] - Optional parameters for the transfer.
       * @param {string} [transferOptions.destinationBlockchainID] - Optional fallback for destination blockchain ID if lookup fails.
       * @param {bigint} [transferOptions.gasLimit] - Optional gas limit for the transfer.
       * @param {string} [transferOptions.feeReceiver] - Optional fee receiver for the transfer.
       * @returns {Promise<object>} A promise that resolves to an object containing deployed contract addresses and transaction hashes for the transfer.
       * @throws {Error} If any step in the bridging process fails.
       */
      // Orchestration method for the full end-to-end bridging process
      async bridgeErc20ToL1(
        sourceChainConfig, 
        destinationChainConfig, 
        homeErc20Address, 
        teleporterAddresses, 
        recipient, 
        amount, 
        transferOptions = {}
    ) {
        if (!this.privateKey) {
            throw new Error('Private key not available in SDK. Ensure constructor is called.');
        }

        let tokenHomeContractAddress;
        let tokenRemoteContractAddress;
        let homeAccount, destinationAccount;
        let homeRegistryBlockchainID;
        let destRegistryBlockchainID;
        let erc20OnHomeChain;  

        console.log(`--- Stage 1: Home Chain (${sourceChainConfig.name}) Setup ---`);
        try {
            homeAccount = await this.createAccount(sourceChainConfig);
            console.log(`Successfully set up account on Home Chain (${sourceChainConfig.name}):`, homeAccount.address);

            const homePublicClient = createPublicClient({ chain: sourceChainConfig, transport: http(sourceChainConfig.rpcUrls.default.http[0]) });

            // Fetch ERC20 details from the contract using the helper method
            erc20OnHomeChain = await this._getErc20Details(homePublicClient, homeErc20Address);
            
            console.log(`Using pre-deployed ERC20 (${erc20OnHomeChain.symbol}) on Home Chain (${sourceChainConfig.name}) at: ${homeErc20Address}`);

            const homeTeleporterRegistryAddress = teleporterAddresses.sourceRegistry;
            const homeTeleporterManager = homeAccount.address;
            const homeMinTeleporterVersion = "1";
            const homeTokenDecimals = erc20OnHomeChain.decimals;

            homeRegistryBlockchainID = await homePublicClient.readContract({
                address: homeTeleporterRegistryAddress,
                abi: teleporterRegistryABI.abi,
                functionName: "blockchainID",
            });
            console.log(`Home Chain (${sourceChainConfig.name}) Teleporter Registry blockchainID:`, homeRegistryBlockchainID);

            console.log(`Deploying TokenHome on Home Chain (${sourceChainConfig.name})...`);
            
            const tokenHomeDeployment = await this.deployTokenHome(
                homeTeleporterRegistryAddress,
                homeTeleporterManager,
                homeMinTeleporterVersion,
                homeErc20Address,
                homeTokenDecimals
            );
            tokenHomeContractAddress = tokenHomeDeployment.address;
            console.log(`TokenHome deployed on Home Chain (${sourceChainConfig.name}) at: ${tokenHomeContractAddress}`);
        } catch (err) {
            console.error(`Error during Home Chain (${sourceChainConfig.name}) setup:`, err);
            throw err;
        }

        // --- Stage 2: Destination Chain (e.g., Dispatch L1) Setup ---
        console.log(`\n--- Stage 2: Destination Chain (${destinationChainConfig.name}) Setup ---`);
        try {
            destinationAccount = await this.createAccount(destinationChainConfig);
            console.log(`Successfully set up account on ${destinationChainConfig.name}:`, destinationAccount.address);

            const destinationTeleporterRegistryAddress = teleporterAddresses.destinationRegistry;
            console.log(`Using ${destinationChainConfig.name} Teleporter Registry:`, destinationTeleporterRegistryAddress);
            
            // It's good practice to verify the destination registry can be read, if not a known pre-deployed one
            const destPublicClient = createPublicClient({ chain: destinationChainConfig, transport: http(destinationChainConfig.rpcUrls.default.http[0]) });
            try {
                destRegistryBlockchainID = await destPublicClient.readContract({
                    address: destinationTeleporterRegistryAddress,
                    abi: teleporterRegistryABI.abi, // Assuming same ABI for all Teleporter Registries
                    functionName: "blockchainID",
                });
                console.log(`${destinationChainConfig.name} Teleporter Registry blockchainID:`, destRegistryBlockchainID);
            } catch(e) {
                 console.warn(`WARNING: Could not read blockchainID from ${destinationChainConfig.name} Teleporter Registry ${destinationTeleporterRegistryAddress}. Error: ${e.message}`);
                 // Potentially use a hardcoded/known ID if lookup fails and it's a known network
            }

            const remoteSettings = {
                teleporterRegistryAddress: destinationTeleporterRegistryAddress,
                teleporterManager: destinationAccount.address, 
                minTeleporterVersion: "1",
                tokenHomeBlockchainID: homeRegistryBlockchainID,
                tokenHomeAddress: tokenHomeContractAddress,
                tokenHomeDecimals: erc20OnHomeChain.decimals 
            };

            const remoteTokenName = `${erc20OnHomeChain.name} (${destinationChainConfig.name})`;
            const remoteTokenSymbol = erc20OnHomeChain.symbol.slice(0,10); 
            const remoteTokenDecimalsForItself = erc20OnHomeChain.decimals;

            console.log(`Deploying TokenRemote on ${destinationChainConfig.name}...`);
            const tokenRemoteDeploymentResult = await this.deployTokenRemote(
                remoteSettings,
                remoteTokenName,
                remoteTokenSymbol,
                remoteTokenDecimalsForItself
            );
            tokenRemoteContractAddress = tokenRemoteDeploymentResult.address;
            console.log(`TokenRemote deployed on ${destinationChainConfig.name} at: ${tokenRemoteContractAddress}`);
        } catch (err) {
            console.error(`Error during Destination Chain (${destinationChainConfig.name}) setup / TokenRemote deployment:`, err);
            throw err;
        }

        // --- Stage 3: Register TokenRemote with TokenHome (on Destination Chain) ---
        console.log(`\n--- Stage 3: Register TokenRemote with TokenHome (on ${destinationChainConfig.name}) ---`);
        if (tokenRemoteContractAddress) {
            try {
                // SDK context is already Destination Chain from the createAccount call above
                console.log(`Registering TokenRemote ${tokenRemoteContractAddress} with its TokenHome...`);
                const registrationReceipt = await this.registerWithHome(tokenRemoteContractAddress);
                console.log("TokenRemote registration transaction successful. Status:", registrationReceipt.status);
            } catch (err) {
                console.error("Error during TokenRemote registration:", err);
                throw err;
            }
        } else {
            const errMsg = "TokenRemote deployment address not available, skipping registration.";
            console.error(errMsg);
            throw new Error(errMsg);
        }

        // --- Stage 4: Transfer Tokens (Home to Destination) ---
        console.log(`\n--- Stage 4: Transfer Tokens from Home Chain (${sourceChainConfig.name}) to ${destinationChainConfig.name} ---`);
        if (homeErc20Address && tokenHomeContractAddress && tokenRemoteContractAddress && destinationAccount) {
            try {
                await this.createAccount(sourceChainConfig);
                console.log(`Switched SDK context back to Home Chain (${sourceChainConfig.name}) for transfer.`);

                let destinationChainIdForTransfer = destRegistryBlockchainID;
                if (!destinationChainIdForTransfer) {
                    console.warn("Destination blockchain ID for transfer was not fetched from registry, ensure transferOptions.destinationBlockchainID is correct.");
                    destinationChainIdForTransfer = transferOptions.destinationBlockchainID;
                    if(!destinationChainIdForTransfer) {
                        throw new Error("Destination Blockchain ID for transfer is missing.")
                    }
                }

                if (!recipient) {
                    throw new Error("Recipient address for transfer is missing.");
                }
                const finalRecipient = recipient;
                console.log(`Transferring to specified recipient: ${finalRecipient}`);

                console.log(`Attempting to transfer ${amount} ${erc20OnHomeChain.symbol} to ${finalRecipient}...`);
                
                const transferResult = await this.transferTokens(
                    homeErc20Address, 
                    finalRecipient, 
                    amount,
                    tokenHomeContractAddress, 
                    tokenRemoteContractAddress, 
                    transferOptions.gasLimit || 250000n,
                    transferOptions.feeReceiver || '0x0000000000000000000000000000000000000000',
                    destinationChainIdForTransfer
                );

                if (transferResult.success) {
                    console.log("Token transfer initiated successfully!");
                    return {
                        erc20Address: homeErc20Address,
                        tokenHomeAddress: tokenHomeContractAddress,
                        tokenRemoteAddress: tokenRemoteContractAddress,
                        transferApproveTxHash: transferResult.approveTxHash,
                        transferSendTxHash: transferResult.sendTxHash
                    };
                } else {
                    console.error("Token transfer failed within SDK:", transferResult.error);
                    throw new Error(`Token transfer failed: ${transferResult.error}`);
                }
            } catch (err) {
                console.error(`Error during cross-chain token transfer (Home Chain ${sourceChainConfig.name} to ${destinationChainConfig.name}):`, err);
                throw err;
            }
        } else {
            const errMsg = "One or more contract addresses are missing, skipping token transfer.";
            console.error(errMsg);
            throw new Error(errMsg);
        }
      }
      
} // End of AvalancheSDK class
 

