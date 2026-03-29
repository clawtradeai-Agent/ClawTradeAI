import {
  IAgent,
  AgentType,
  AgentConfig,
  AgentOutput,
  Decision,
  AgentStatus,
  AgentLogger,
} from './types';

/**
 * Default agent configuration
 */
const DEFAULT_CONFIG: AgentConfig = {
  enabled: true,
  intervalMs: 5000,
  logLevel: 'info',
  mockMode: false,
};

/**
 * Base agent class that all agents extend
 */
export abstract class BaseAgent implements IAgent {
  abstract readonly type: AgentType;

  protected readonly config: AgentConfig;
  protected running = false;
  protected lastRun?: Date;
  protected lastAction?: string;
  protected decisionsCount = 0;
  protected successfulDecisions = 0;
  protected intervalId?: NodeJS.Timeout;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Logger for the agent
   */
  protected get logger(): AgentLogger {
    return {
      debug: (msg, data) => this.log('debug', msg, data),
      info: (msg, data) => this.log('info', msg, data),
      warn: (msg, data) => this.log('warn', msg, data),
      error: (msg, data) => this.log('error', msg, data),
    };
  }

  private log(level: string, message: string, data?: unknown): void {
    const logLevel = this.config.logLevel;
    const levels = ['debug', 'info', 'warn', 'error'];

    if (levels.indexOf(level) < levels.indexOf(logLevel)) {
      return;
    }

    const prefix = `[${this.type}]`;
    const timestamp = new Date().toISOString();

    if (data !== undefined) {
      console.log(`${timestamp} ${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing agent...');
    await this.onInitialize();
    this.logger.info('Agent initialized');
  }

  /**
   * Override this method for custom initialization
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Process input and return agent output
   */
  async process(input: unknown): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      const result = await this.onProcess(input);
      this.decisionsCount++;
      this.lastRun = new Date();
      this.lastAction = result.action;

      if (result.decision !== Decision.SKIP) {
        this.successfulDecisions++;
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Processed in ${duration}ms`, {
        decision: result.decision,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      this.logger.error('Processing failed', { error });
      throw error;
    }
  }

  /**
   * Override this method to implement agent-specific processing
   */
  protected abstract onProcess(input: unknown): Promise<AgentOutput>;

  /**
   * Run the agent's main loop
   */
  async run(): Promise<void> {
    if (this.running) {
      this.logger.warn('Agent is already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Agent is disabled');
      return;
    }

    this.running = true;
    this.logger.info(`Starting agent loop (interval: ${this.config.intervalMs}ms)`);

    await this.onRun();

    this.intervalId = setInterval(async () => {
      try {
        await this.onTick();
      } catch (error) {
        this.logger.error('Tick failed', { error });
      }
    }, this.config.intervalMs);
  }

  /**
   * Override this method for custom run logic
   */
  protected async onRun(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Called on each tick of the agent loop
   */
  protected async onTick(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Stop the agent
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.running = false;
    this.logger.info('Agent stopped');
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return {
      type: this.type,
      running: this.running,
      lastRun: this.lastRun,
      lastAction: this.lastAction,
      decisionsCount: this.decisionsCount,
      successRate: this.decisionsCount > 0
        ? (this.successfulDecisions / this.decisionsCount) * 100
        : 0,
    };
  }

  /**
   * Create an agent output object
   */
  protected createOutput<T>(
    action: string,
    decision: Decision,
    confidence: number,
    data: T,
    metadata?: Record<string, unknown>
  ): AgentOutput<T> {
    return {
      agentType: this.type,
      action,
      decision,
      confidence: Math.min(1, Math.max(0, confidence)),
      data,
      timestamp: new Date(),
      metadata,
    };
  }
}
