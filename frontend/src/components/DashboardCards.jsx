import React from 'react';

const DashboardCards = ({ stats }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const isEmployee = user && user.role === 'employee';
  const cards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads || 0,
      icon: '👥',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      hide: isEmployee
    },
    {
      title: 'Active Leads',
      value: stats.activeLeads || 0,
      icon: '🔥',
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Completed',
      value: stats.completedLeads || 0,
      icon: '✅',
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Today\'s Follow-ups',
      value: stats.todayFollowUps || 0,
      icon: '📅',
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {cards.filter(card => !card.hide).map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;