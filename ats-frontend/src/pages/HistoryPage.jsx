import React from 'react';
import AnalysisHistory from '../components/AnalysisHistory';
import UsageSummaryCard from '../components/UsageSummaryCard';

const HistoryPage = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <UsageSummaryCard />
      <AnalysisHistory />
    </div>
  );
};

export default HistoryPage;
