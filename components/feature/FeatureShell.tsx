'use client';

import { ReactNode } from 'react';

type FeatureShellProps = {
  variant?: 'app' | string;
  children: ReactNode;
};

export default function FeatureShell({ variant = 'app', children }: FeatureShellProps) {
  return <div data-feature-shell={variant}>{children}</div>;
}
