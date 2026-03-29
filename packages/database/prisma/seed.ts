import { PrismaClient, AgentType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password for demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@clawtrade.ai' },
    update: {},
    create: {
      email: 'demo@clawtrade.ai',
      password: hashedPassword,
      username: 'demo_trader',
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create sample agent logs
  const agentTypes: AgentType[] = [
    'SNIPER',
    'ANALYST',
    'RISK_MANAGER',
    'STRATEGY',
    'EXECUTOR',
    'COORDINATOR',
  ];

  for (const agentType of agentTypes) {
    await prisma.agentLog.create({
      data: {
        agentType,
        action: 'system_init',
        decision: 'READY',
        confidence: 1.0,
        metadata: JSON.stringify({
          version: '1.0.0',
          initialized: true,
        }),
      },
    });
  }

  console.log('✅ Created sample agent logs');

  // Create sample portfolio entries
  const tokens = [
    {
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
    },
    {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
    },
    {
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      name: 'Tether USD',
    },
  ];

  for (const token of tokens) {
    await prisma.portfolio.upsert({
      where: {
        userId_tokenMint: {
          userId: demoUser.id,
          tokenMint: token.mint,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        tokenName: token.name,
        balance: 0,
        averagePrice: 0,
        currentValue: 0,
        pnl: 0,
        pnlPercent: 0,
      },
    });
  }

  console.log('✅ Created sample portfolio entries');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
