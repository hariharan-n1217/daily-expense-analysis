import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

const SavingsGraph = ({ savingsData }) => {
 

  if (!savingsData || savingsData.length === 0) {
    return <p>No savings data available to display.</p>;
  }

  const amounts = savingsData.map((d) => Number(d.amount));
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={savingsData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`$${value}`, 'Savings']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Bar
            dataKey="amount"
            radius={[6, 6, 0, 0]}
           
            isAnimationActive={true}
            animationBegin={200}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {savingsData.map((entry, index) => {
              const val = Number(entry.amount);
            
              let fillColor = '#3b82f6'; // Default Blue
              if (val === maxAmount && maxAmount > 0) fillColor = '#10b981'; // Green for high
              if (val === minAmount && minAmount !== maxAmount) fillColor = '#f59e0b'; // Amber for low

              return <Cell key={`cell-${index}`} fill={fillColor} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SavingsGraph;