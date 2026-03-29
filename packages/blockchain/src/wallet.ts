import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { encryptKeypair, decryptKeypair } from './encryption';
import { getBalance, solToLamports, getRecentBlockhash } from './solana';

/**
 * Wallet manager for handling Solana wallets
 */
export interface WalletInfo {
  address: string;
  publicKey: PublicKey;
  balanceSOL: number;
}

export interface TransferOptions {
  to: string;
  amount: number; // in SOL
  priorityFeeLamports?: number;
}

export interface TransferResult {
  signature: string;
  success: boolean;
  error?: string;
}

export class WalletManager {
  private connection: Connection;
  private encryptionKey: string;

  constructor(connection: Connection, encryptionKey: string) {
    this.connection = connection;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Create a new wallet
   */
  createWallet(): { keypair: Keypair; encryptedPrivateKey: string; address: string } {
    const keypair = Keypair.generate();
    const encryptedPrivateKey = encryptKeypair(keypair, this.encryptionKey);
    return {
      keypair,
      encryptedPrivateKey,
      address: keypair.publicKey.toString(),
    };
  }

  /**
   * Import a wallet from secret key
   */
  importWallet(secretKeyBase58: string): { keypair: Keypair; encryptedPrivateKey: string; address: string } {
    const secretKey = Buffer.from(bs58.decode(secretKeyBase58));
    const keypair = Keypair.fromSecretKey(secretKey);
    const encryptedPrivateKey = encryptKeypair(keypair, this.encryptionKey);
    return {
      keypair,
      encryptedPrivateKey,
      address: keypair.publicKey.toString(),
    };
  }

  /**
   * Get wallet info including balance
   */
  async getWalletInfo(address: string): Promise<WalletInfo> {
    const publicKey = new PublicKey(address);
    const balanceSOL = await getBalance(this.connection, address);
    return {
      address,
      publicKey,
      balanceSOL,
    };
  }

  /**
   * Get keypair from encrypted private key
   */
  getKeypair(encryptedPrivateKey: string): Keypair {
    return decryptKeypair(encryptedPrivateKey, this.encryptionKey);
  }

  /**
   * Transfer SOL to another address
   */
  async transfer(
    encryptedPrivateKey: string,
    options: TransferOptions
  ): Promise<TransferResult> {
    try {
      const keypair = this.getKeypair(encryptedPrivateKey);
      const toPublicKey = new PublicKey(options.to);
      const lamports = solToLamports(options.amount);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      const recentBlockhash = await getRecentBlockhash(this.connection);
      transaction.recentBlockhash = recentBlockhash;
      transaction.feePayer = keypair.publicKey;

      transaction.sign(keypair);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        { commitment: 'confirmed' }
      );

      return {
        signature,
        success: true,
      };
    } catch (error) {
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign a transaction
   */
  signTransaction(
    encryptedPrivateKey: string,
    transaction: Transaction
  ): Transaction {
    const keypair = this.getKeypair(encryptedPrivateKey);
    transaction.sign(keypair);
    return transaction;
  }

  /**
   * Sign a versioned transaction
   */
  signVersionedTransaction(
    encryptedPrivateKey: string,
    transaction: VersionedTransaction
  ): VersionedTransaction {
    const keypair = this.getKeypair(encryptedPrivateKey);
    transaction.sign([keypair]);
    return transaction;
  }

  /**
   * Verify ownership of a wallet
   */
  async verifyOwnership(encryptedPrivateKey: string, address: string): Promise<boolean> {
    try {
      const keypair = this.getKeypair(encryptedPrivateKey);
      return keypair.publicKey.toString() === address;
    } catch {
      return false;
    }
  }
}
