/**
 * Wallet Integration for Polymarket CLOB
 * 
 * Handles:
 * - Private key management
 * - Message signing for authentication
 * - Order signing
 */

import { Wallet } from "ethers";

export interface WalletConfig {
  privateKey: string;
  chainId: number;
  rpcUrl?: string;
}

/**
 * Wallet manager for Polymarket trading
 * Handles signing operations for CLOB API authentication and order execution
 */
export class WalletManager {
  private wallet: Wallet;
  private chainId: number;

  constructor(config: WalletConfig) {
    this.chainId = config.chainId;
    
    // Create wallet from private key
    this.wallet = new Wallet(config.privateKey);
    
    console.log(`🔑 Wallet initialized: ${this.wallet.address}`);
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Sign a message for CLOB API authentication
   * Used to derive API credentials from wallet signature
   */
  async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  /**
   * Sign typed data for order submission
   * Uses EIP-712 structured data signing
   */
  async signTypedData(
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    },
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, any>
  ): Promise<string> {
    return await this.wallet.signTypedData(domain, types, value);
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainId;
  }
}
