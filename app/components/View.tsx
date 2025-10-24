'use client';

import React from 'react';

interface ViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const View = React.forwardRef<HTMLDivElement, ViewProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
);

View.displayName = 'View';

export default View; 