import axios, { AxiosInstance } from 'axios';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';

/**
 * Jupiter Aggregator API types
 */
export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: number; // in smallest unit (lamports for SOL, cents for USDC)
  slippageBps: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
}

export interface QuoteResponse {
  inputMint: string;
  inputAmount: string;
  outputMint: string;
  outputAmount: string;
  priceImpactPct: string;
  slippageBps: number;
  routePlan: RoutePlan[];
  contextSlot: number;
  timeTaken: number;
}

export interface RoutePlan {
  swapInfo: SwapInfo;
  percent: number;
}

export interface SwapInfo {
  ammKey: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  feeAmount: string;
  feeMint: string;
}

export interface SwapRequest {
  quoteResponse: QuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  useSharedAccounts?: boolean;
  dynamicComputeUnitLimit?: boolean;
  prioritizationFeeLamports?: number;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
  computeUnitLimit: number;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags: string[];
}

export interface PriceResponse {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

/**
 * Jupiter Aggregator API client
 * Documentation: https://station.jup.ag/docs/apis/swap-api
 */
export class JupiterClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'https://quote-api.jup.ag/v6') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const params = new URLSearchParams({
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      amount: request.amount.toString(),
      slippageBps: request.slippageBps.toString(),
    });

    if (request.onlyDirectRoutes) {
      params.append('onlyDirectRoutes', 'true');
    }

    if (request.asLegacyTransaction) {
      params.append('asLegacyTransaction', 'true');
    }

    const response = await this.client.get<QuoteResponse>(`/quote?${params}`);
    return response.data;
  }

  /**
   * Get swap transaction
   */
  async getSwap(request: SwapRequest): Promise<SwapResponse> {
    const response = await this.client.post<SwapResponse>('/swap', request);
    return response.data;
  }

  /**
   * Get swap transaction with quote
   * Combined endpoint for quote + swap
   */
  async swap(request: SwapRequest & { quoteResponse?: QuoteResponse }): Promise<SwapResponse> {
    const response = await this.client.post<SwapResponse>('/swap', request);
    return response.data;
  }

  /**
   * Get token prices in USDC
   */
  async getPrices(tokenMints: string[]): Promise<Record<string, PriceResponse>> {
    const ids = tokenMints.join(',');
    const response = await this.client.get<Record<string, PriceResponse>>(
      `/price?ids=${ids}`
    );
    return response.data;
  }

  /**
   * Get price for a single token
   */
  async getPrice(tokenMint: string): Promise<number> {
    const prices = await this.getPrices([tokenMint]);
    return prices[tokenMint]?.price ?? 0;
  }

  /**
   * Get all tokens supported by Jupiter
   */
  async getTokens(includeAll = false): Promise<TokenInfo[]> {
    const url = includeAll
      ? 'https://token.jup.ag/all'
      : 'https://token.jup.ag/strict';

    const response = await axios.get<TokenInfo[]>(url);
    return response.data;
  }

  /**
   * Get route plan for a swap (for analysis)
   */
  async getRoutePlan(request: QuoteRequest): Promise<RoutePlan[]> {
    const quote = await this.getQuote(request);
    return quote.routePlan;
  }

  /**
   * Calculate price impact percentage
   */
  calculatePriceImpact(quote: QuoteResponse): number {
    return parseFloat(quote.priceImpactPct) * 100;
  }

  /**
   * Calculate effective price (output per input)
   */
  calculateEffectivePrice(quote: QuoteResponse): number {
    const inputAmount = parseFloat(quote.inputAmount);
    const outputAmount = parseFloat(quote.outputAmount);
    return outputAmount / inputAmount;
  }

  /**
   * Deserialize swap transaction
   */
  deserializeSwapTransaction(swapTransaction: string): VersionedTransaction {
    const transactionBuffer = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuffer);
  }

  /**
   * Build a complete swap transaction
   */
  async buildSwapTransaction(
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: string,
    slippageBps: number = 50,
    prioritizationFeeLamports: number = 5000
  ): Promise<{
    transaction: VersionedTransaction;
    quote: QuoteResponse;
  }> {
    // Get quote
    const quote = await this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps,
    });

    // Get swap transaction
    const swapResponse = await this.getSwap({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports,
    });

    // Deserialize transaction
    const transaction = this.deserializeSwapTransaction(swapResponse.swapTransaction);

    return {
      transaction,
      quote,
    };
  }
}

// Export singleton instance
export const jupiterClient = new JupiterClient();
