import React from 'react';

interface VirtualListProps {
  itemCount: number;
  itemHeight: number; // px
  height: number; // px
  overscan?: number;
  className?: string;
  role?: string;
  renderItem: (index: number) => React.ReactNode;
}

/**
 * Lightweight vertical virtual list (no external deps)
 * Assumes relatively uniform item heights.
 */
export type VirtualListHandle = {
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'nearest') => void;
};

export const VirtualList = React.forwardRef<VirtualListHandle, VirtualListProps>(({
  itemCount,
  itemHeight,
  height,
  overscan = 6,
  className,
  role,
  renderItem,
}, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const heightsRef = React.useRef<number[]>(Array.from({ length: itemCount }, () => itemHeight));
  const offsetsRef = React.useRef<number[]>([]);
  const [, force] = React.useState(0);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  };

  // Recompute offsets when itemCount changes
  React.useEffect(() => {
    if (heightsRef.current.length !== itemCount) {
      heightsRef.current = Array.from({ length: itemCount }, (_, i) => heightsRef.current[i] ?? itemHeight);
      offsetsRef.current = [];
      computeOffsets();
    }
  }, [itemCount, itemHeight]);

  const computeOffsets = () => {
    const arr = heightsRef.current;
    const off = new Array(arr.length + 1);
    off[0] = 0;
    for (let i = 0; i < arr.length; i++) off[i + 1] = off[i] + (arr[i] || itemHeight);
    offsetsRef.current = off as number[];
  };
  if (offsetsRef.current.length === 0) computeOffsets();

  const totalHeight = offsetsRef.current[offsetsRef.current.length - 1] || (itemCount * itemHeight);

  const findIndexForOffset = (offset: number) => {
    // binary search in offsetsRef
    let lo = 0, hi = itemCount; // offsets length = itemCount+1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (offsetsRef.current[mid] <= offset) lo = mid + 1; else hi = mid;
    }
    return Math.max(0, lo - 1);
  };

  const startIndex = Math.max(0, findIndexForOffset(scrollTop) - overscan);
  const viewportBottom = scrollTop + height;
  let endIndex = findIndexForOffset(viewportBottom) + overscan;
  if (endIndex > itemCount - 1) endIndex = itemCount - 1;

  const items: React.ReactNode[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const style: React.CSSProperties = {
      position: 'absolute',
      top: offsetsRef.current[i],
      left: 0,
      right: 0,
      // 不强制高度，允许内容自适应测量，首次回退为最小高度
      minHeight: heightsRef.current[i] ?? itemHeight,
    };
    items.push(
      <MeasuredItem
        key={i}
        index={i}
        style={style}
        role={role === 'list' ? 'listitem' : undefined}
        onSize={(h) => {
          if (h && Math.abs((heightsRef.current[i] || 0) - h) > 0.5) {
            heightsRef.current[i] = h;
            computeOffsets();
            force(v => v + 1);
          }
        }}
      >
        {renderItem(i)}
      </MeasuredItem>
    );
  }

  React.useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, align: 'start' | 'center' | 'end' | 'nearest' = 'nearest') => {
      if (!containerRef.current) return;
      const top = offsetsRef.current[index] ?? 0;
      const bottom = offsetsRef.current[index + 1] ?? (top + itemHeight);
      const viewTop = containerRef.current.scrollTop;
      const viewBottom = viewTop + height;
      let next = viewTop;
      if (align === 'start') next = top; else if (align === 'end') next = bottom - height; else if (align === 'center') next = top - Math.max(0, (height - (bottom - top)) / 2); else {
        if (top < viewTop) next = top; else if (bottom > viewBottom) next = bottom - height; else next = viewTop;
      }
      containerRef.current.scrollTo({ top: Math.max(0, next), behavior: 'smooth' });
    }
  }), [height, itemHeight]);

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className ?? ''}`}
      style={{ height, overflowY: 'auto' }}
      onScroll={onScroll}
      role={role}
      aria-label={role === 'list' ? 'Clang-Format Options List' : undefined}
    >
      <div className="virtual-list-inner" style={{ height: totalHeight }}>
        {items}
      </div>
    </div>
  );
});

const MeasuredItem: React.FC<{ index: number; style: React.CSSProperties; role?: string; onSize: (h: number) => void; children: React.ReactNode }>
  = ({ index, style, role, onSize, children }) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      // fallback: measure once
      const h = el?.getBoundingClientRect().height ?? 0;
      if (h) onSize(h);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect?.height ?? 0;
        if (h) onSize(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onSize]);

  return (
    <div ref={hostRef} style={style} role={role as any} data-idx={index}>
      <div className="vl-item-pad">
        {children}
      </div>
    </div>
  );
};
