'use client';

export function PortfolioChart() {
  // In production, this would use a charting library like Recharts or Chart.js
  // For now, we'll show a placeholder with mock data visualization

  const mockData = [
    { day: 'Mon', value: 1000 },
    { day: 'Tue', value: 1200 },
    { day: 'Wed', value: 1100 },
    { day: 'Thu', value: 1400 },
    { day: 'Fri', value: 1300 },
    { day: 'Sat', value: 1600 },
    { day: 'Sun', value: 1500 },
  ];

  const maxValue = Math.max(...mockData.map((d) => d.value));

  return (
    <div className="h-64 flex items-end justify-between gap-2 px-4">
      {mockData.map((item, index) => {
        const height = (item.value / maxValue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-lg transition-all duration-500"
              style={{ height: `${height}%` }}
            />
            <span className="text-xs text-gray-400">{item.day}</span>
          </div>
        );
      })}
    </div>
  );
}
