import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { JupiterClient, QuoteResponse } from './jupiter';
import { confirmTransaction, TOKENS } from '@clawtrade/blockchain';

/**
 * Trading types
 */
export type TradeType = 'BUY' | 'SELL';

export interface TradeConfig {
  slippageBps: number;
  maxTradeAmountSOL: number;
  minTradeAmountSOL: number;
  prioritizationFeeLamports: number;
}

export interface TradeInput {
  type: TradeType;
  inputMint: string;
  outputMint: string;
  amount: number; // in input token smallest unit
  keypair: Keypair;
  connection: Connection;
}

export interface TradeOutput {
  success: boolean;
  signature?: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  error?: string;
  quote: QuoteResponse;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  price: number;
  timestamp: Date;
  error?: string;
}

/**
 * Default trading configuration
 */
const DEFAULT_CONFIG: TradeConfig = {
  slippageBps: 50, // 0.5%
  maxTradeAmountSOL: 1,
  minTradeAmountSOL: 0.01,
  prioritizationFeeLamports: 5000,
};

/**
 * Trading engine for executing swaps on Solana via Jupiter
 */
export class TradingEngine {
  private connection: Connection;
  private jupiterClient: JupiterClient;
  private config: TradeConfig;

  constructor(
    connection: Connection,
    jupiterClient: JupiterClient,
    config: Partial<TradeConfig> = {}
  ) {
    this.connection = connection;
    this.jupiterClient = jupiterClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update trading configuration
   */
  updateConfig(config: Partial<TradeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TradeConfig {
    return { ...this.config };
  }

  /**
   * Validate trade amount
   */
  private validateAmount(amountLamports: number, inputMint: string): { valid: boolean; error?: string } {
    const amountSOL = amountLamports / 1e9;

    if (amountSOL < this.config.minTradeAmountSOL) {
      return {
        valid: false,
        error: `Amount ${amountSOL} SOL is below minimum ${this.config.minTradeAmountSOL} SOL`,
      };
    }

    if (amountSOL > this.config.maxTradeAmountSOL) {
      return {
        valid: false,
        error: `Amount ${amountSOL} SOL is above maximum ${this.config.maxTradeAmountSOL} SOL`,
      };
    }

    return { valid: true };
  }

  /**
   * Execute a trade
   */
  async executeTrade(input: TradeInput): Promise<TradeOutput> {
    try {
      // Validate amount
      const validation = this.validateAmount(input.amount, input.inputMint);
      if (!validation.valid) {
        return {
          success: false,
          inputAmount: input.amount.toString(),
          outputAmount: '0',
          priceImpact: 0,
          error: validation.error,
          quote: null as unknown as QuoteResponse,
        };
      }

      // Get quote
      const quote = await this.jupiterClient.getQuote({
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        amount: input.amount,
        slippageBps: this.config.slippageBps,
      });

      // Calculate price impact
      const priceImpact = parseFloat(quote.priceImpactPct) * 100;

      // Build swap transaction
      const swapResponse = await this.jupiterClient.getSwap({
        quoteResponse: quote,
        userPublicKey: input.keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: this.config.prioritizationFeeLamports,
      });

      // Deserialize transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swapResponse.swapTransaction, 'base64')
      );

      // Sign transaction
      transaction.sign([input.keypair]);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm transaction
      await confirmTransaction(this.connection, signature);

      return {
        success: true,
        signature,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact,
        quote,
      };
    } catch (error) {
      return {
        success: false,
        inputAmount: input.amount.toString(),
        outputAmount: '0',
        priceImpact: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        quote: null as unknown as QuoteResponse,
      };
    }
  }

  /**
   * Execute a BUY trade (SOL -> Token)
   */
  async buy(
    tokenMint: string,
    amountSOL: number,
    keypair: Keypair
  ): Promise<TradeOutput> {
    const amountLamports = Math.floor(amountSOL * 1e9);

    return this.executeTrade({
      type: 'BUY',
      inputMint: TOKENS.SOL.mint,
      outputMint: tokenMint,
      amount: amountLamports,
      keypair,
      connection: this.connection,
    });
  }

  /**
   * Execute a SELL trade (Token -> SOL)
   */
  async sell(
    tokenMint: string,
    amount: number,
    tokenDecimals: number,
    keypair: Keypair
  ): Promise<TradeOutput> {
    const amountSmallestUnit = Math.floor(amount * Math.pow(10, tokenDecimals));

    return this.executeTrade({
      type: 'SELL',
      inputMint: tokenMint,
      outputMint: TOKENS.SOL.mint,
      amount: amountSmallestUnit,
      keypair,
      connection: this.connection,
    });
  }

  /**
   * Get quote for a trade
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<QuoteResponse> {
    return this.jupiterClient.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: this.config.slippageBps,
    });
  }

  /**
   * Simulate a trade (get quote without executing)
   */
  async simulateTrade(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<{
    inputAmount: string;
    outputAmount: string;
    priceImpact: number;
    effectivePrice: number;
    routePlan: string[];
  }> {
    const quote = await this.getQuote(inputMint, outputMint, amount);

    const routePlan = quote.routePlan.map((route) => route.swapInfo.label);
    const effectivePrice = this.jupiterClient.calculateEffectivePrice(quote);
    const priceImpact = this.jupiterClient.calculatePriceImpact(quote);

    return {
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
      priceImpact,
      effectivePrice,
      routePlan,
    };
  }

  /**
   * Get token price in USDC
   */
  async getTokenPrice(tokenMint: string): Promise<number> {
    return this.jupiterClient.getPrice(tokenMint);
  }

  /**
   * Get multiple token prices in USDC
   */
  async getTokenPrices(tokenMints: string[]): Promise<Record<string, number>> {
    const prices = await this.jupiterClient.getPrices(tokenMints);
    const result: Record<string, number> = {};
    for (const [mint, data] of Object.entries(prices)) {
      result[mint] = data.price;
    }
    return result;
  }
}

// Export singleton instance (requires connection to be set)
export function createTradingEngine(
  connection: Connection,
  config?: Partial<TradeConfig>
): TradingEngine {
  return new TradingEngine(connection, new JupiterClient(), config);
}
