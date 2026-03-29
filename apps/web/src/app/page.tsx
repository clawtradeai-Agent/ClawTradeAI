'use client';

import Link from 'next/link';
import { Button } from '@clawtrade/ui';

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-slide-up">
            Autonomous Intelligence for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              On-Chain Trading
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            ClawTrade AI uses a multi-agent system to scan, analyze, and execute trades on Solana in real time.
            Let AI manage your trading strategies automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Launch App
              </Button>
            </Link>
            <Link href="https://github.com/clawtrade/clawtrade-ai" target="_blank">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View on GitHub
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 text-gray-400">
            <Link 
              href="https://clawtradeai.xyz" 
              target="_blank"
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              clawtradeai.xyz
            </Link>
            <Link 
              href="https://x.com/ClawtradeAISol" 
              target="_blank"
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @ClawtradeAISol
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Powered by Multi-Agent AI
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎯"
              title="Sniper Agent"
              description="Scans for new token launches and liquidity pools in real-time"
            />
            <FeatureCard
              icon="📊"
              title="Analyst Agent"
              description="Performs technical, fundamental, and sentiment analysis"
            />
            <FeatureCard
              icon="🛡️"
              title="Risk Manager"
              description="Evaluates liquidity, contract safety, and concentration risks"
            />
            <FeatureCard
              icon="🧠"
              title="Strategy Agent"
              description="Determines position sizing and sets take-profit/stop-loss levels"
            />
            <FeatureCard
              icon="⚡"
              title="Executor Agent"
              description="Executes trades via Jupiter with optimal routing"
            />
            <FeatureCard
              icon="🤖"
              title="Coordinator"
              description="Combines all agent outputs for final trading decisions"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="6" label="AI Agents" />
            <StatCard value="&lt;5s" label="Decision Time" />
            <StatCard value="24/7" label="Monitoring" />
            <StatCard value="0.5%" label="Avg Slippage" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Trading?
          </h2>
          <p className="text-gray-400 mb-8">
            Join ClawTrade AI and let autonomous agents work for you 24/7.
          </p>
          <Link href="/dashboard">
            <Button size="lg">
              Get Started
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
        {value}
      </div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}
