import React from 'react';

// A simple mock of a LineChart for the starter template
export function LineChart({ data }) {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  return (
    <div className="h-64 bg-gray-50 flex items-end space-x-2 p-4 rounded-lg">
      {data.map((item, index) => (
        <div 
          key={index} 
          className="bg-blue-500 w-12 rounded-t transition-all hover:bg-blue-600 cursor-pointer relative group"
          style={{ height: `${item.count * 5}%` }}
        >
          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded w-max">
            {item.date}: {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}
