'use client';

import { Badge } from '@clawtrade/ui';

const agents = [
  { type: 'SNIPER', name: 'Sniper Agent', icon: '🎯' },
  { type: 'ANALYST', name: 'Analyst Agent', icon: '📊' },
  { type: 'RISK_MANAGER', name: 'Risk Manager', icon: '🛡️' },
  { type: 'STRATEGY', name: 'Strategy Agent', icon: '🧠' },
  { type: 'EXECUTOR', name: 'Executor Agent', icon: '⚡' },
  { type: 'COORDINATOR', name: 'Coordinator', icon: '🤖' },
];

export function AgentStatus() {
  // In production, this would fetch real agent status from the API
  const agentStatuses = agents.map((agent) => ({
    ...agent,
    status: 'active' as const,
    lastRun: new Date(),
  }));

  return (
    <div className="space-y-4">
      {agentStatuses.map((agent) => (
        <div
          key={agent.type}
          className="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <div className="text-sm font-medium text-white">{agent.name}</div>
              <div className="text-xs text-gray-500">
                Last: {agent.lastRun.toLocaleTimeString()}
              </div>
            </div>
          </div>
          <Badge
            variant={agent.status === 'active' ? 'success' : 'default'}
            size="sm"
          >
            {agent.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ))}
    </div>
  );
}
