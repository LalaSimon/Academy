import React from 'react';

const cache: Record<string, React.FC> = {};

export const framerMotionMock = {
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        if (!cache[tag]) {
          cache[tag] = ({ children, ...rest }: React.HTMLAttributes<HTMLElement> & { [k: string]: unknown }) => {
            const Comp = tag as keyof JSX.IntrinsicElements;
            // Filter out framer-motion specific props that are invalid on DOM elements
            const { initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...domProps } = rest as Record<string, unknown>;
            void initial; void animate; void exit; void transition; void variants; void whileHover; void whileTap; void layout; void layoutId;
            return React.createElement(Comp, domProps as React.HTMLAttributes<HTMLElement>, children);
          };
        }
        return cache[tag];
      },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
};
