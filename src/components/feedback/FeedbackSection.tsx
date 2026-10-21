'use client';

import { useState } from 'react';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackList } from './FeedbackList';
import { Separator } from '../ui/separator';

interface FeedbackSectionProps {
  displayMode?: 'home' | 'full';
}

export function FeedbackSection({ displayMode = 'full' }: FeedbackSectionProps) {
  // This key is used to force a re-render of the list when a new feedback is submitted or deleted.
  const [listKey, setListKey] = useState(0);

  const handleFeedbackChange = () => {
    // Incrementing the key will cause the FeedbackList component to re-mount
    // and re-fetch the data.
    setListKey(prevKey => prevKey + 1);
  };

  return (
    <div className="space-y-12">
      <div className="p-8 border rounded-xl shadow-sm">
        <FeedbackForm onFeedbackSubmitted={handleFeedbackChange} />
      </div>
      <div className="space-y-6">
        <Separator />
        <FeedbackList
          key={listKey}
          onFeedbackDeleted={handleFeedbackChange}
          displayMode={displayMode}
        />
      </div>
    </div>
  );
}
