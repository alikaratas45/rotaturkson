
'use client';

import { createElement } from 'react';

type JsonLdProps = {
  data: Record<string, any>;
};

export const JsonLd = ({ data }: JsonLdProps) => {
  return createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  });
};
