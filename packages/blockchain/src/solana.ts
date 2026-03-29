import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  Commitment,
  Cluster,
} from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Solana network configurations
 */
export const SOLANA_NETWORKS: Record<string, { rpc: string; ws?: string }> = {
  'mainnet-beta': {
    rpc: 'https://api.mainnet-beta.solana.com',
  },
  devnet: {
    rpc: 'https://api.devnet.solana.com',
  },
  testnet: {
    rpc: 'https://api.testnet.solana.com',
  },
  'localnet': {
    rpc: 'http://localhost:8899',
  },
};

/**
 * Common token mints on Solana
 */
export const TOKENS = {
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    name: 'Solana',
  },
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  USDT: {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
  },
  WSOL: {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'WSOL',
    decimals: 9,
    name: 'Wrapped SOL',
  },
} as const;

/**
 * Create a Solana connection instance
 */
export function createConnection(rpcUrl: string, commitment: Commitment = 'confirmed'): Connection {
  return new Connection(rpcUrl, {
    commitment,
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Create a keypair from a secret key (base58 encoded)
 */
export function createKeypairFromSecretKey(secretKey: string): Keypair {
  const secretKeyBytes = bs58.decode(secretKey);
  return Keypair.fromSecretKey(secretKeyBytes);
}

/**
 * Create a random keypair
 */
export function createKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Get the public key from a base58 encoded string
 */
export function getPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

/**
 * Serialize a keypair to base58 (for storage)
 */
export function serializeKeypair(keypair: Keypair): string {
  return bs58.encode(keypair.secretKey);
}

/**
 * Deserialize a keypair from base58
 */
export function deserializeKeypair(secretKey: string): Keypair {
  return createKeypairFromSecretKey(secretKey);
}

/**
 * Calculate the lamports from SOL amount
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Calculate the SOL amount from lamports
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Get account balance in SOL
 */
export async function getBalance(connection: Connection, address: string): Promise<number> {
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return lamportsToSol(balance);
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number> {
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
}

/**
 * Build a transaction with compute budget
 */
export function buildTransaction(
  instructions: TransactionInstruction[],
  priorityFeeLamports: number = 5000,
  computeUnits: number = 200000
): Transaction {
  const tx = new Transaction();

  // Add compute budget instructions
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeLamports })
  );

  // Add main instructions
  tx.add(...instructions);

  return tx;
}

/**
 * Simulate a transaction
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: VersionedTransaction | Transaction,
  signers?: Keypair[]
): Promise<{ logs: string[]; err: unknown; unitsConsumed?: number }> {
  if (transaction instanceof VersionedTransaction) {
    const result = await connection.simulateTransaction(transaction);
    return {
      logs: result.value.logs || [],
      err: result.value.err,
      unitsConsumed: result.value.unitsConsumed,
    };
  }

  const result = await connection.simulateTransaction(transaction, signers);
  return {
    logs: result.value.logs || [],
    err: result.value.err,
    unitsConsumed: result.value.unitsConsumed,
  };
}

/**
 * Confirm a transaction
 */
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<void> {
  const result = await connection.confirmTransaction(signature, commitment);
  if (result.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  }
}

/**
 * Get recent blockhash
 */
export async function getRecentBlockhash(connection: Connection): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

/**
 * Check if an address is a valid Solana public key
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the cluster from RPC URL
 */
export function getClusterFromRpc(rpcUrl: string): Cluster | 'custom' {
  if (rpcUrl.includes('mainnet')) return 'mainnet-beta';
  if (rpcUrl.includes('devnet')) return 'devnet';
  if (rpcUrl.includes('testnet')) return 'testnet';
  return 'custom';
}
