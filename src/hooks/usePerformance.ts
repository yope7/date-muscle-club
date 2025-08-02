import { useCallback, useRef, useEffect, useMemo, useState } from "react";

// デバウンスフック
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
};

// スロットリングフック
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        callback(...args);
        lastCall.current = now;
      } else {
        if (lastCallTimer.current) {
          clearTimeout(lastCallTimer.current);
        }
        lastCallTimer.current = setTimeout(() => {
          callback(...args);
          lastCall.current = Date.now();
        }, delay - (now - lastCall.current));
      }
    }) as T,
    [callback, delay]
  );
};

// メモ化された値の比較フック
export const useMemoizedValue = <T>(
  value: T,
  deps: React.DependencyList
): T => {
  return useMemo(() => value, deps);
};

// パフォーマンス監視フック
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `${componentName} rendered ${
          renderCount.current
        } times in ${timeSinceLastRender.toFixed(2)}ms`
      );
    }

    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    resetRenderCount: () => {
      renderCount.current = 0;
    },
  };
};

// 仮想化のためのインデックス計算フック
export const useVirtualization = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
) => {
  return useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      itemCount
    );

    return {
      startIndex,
      endIndex,
      visibleItems: endIndex - startIndex,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop]);
};

// データの差分検出フック
export const useDataDiff = <T>(
  data: T[],
  keyExtractor: (item: T, index: number) => string | number
) => {
  const prevDataRef = useRef<T[]>([]);
  const prevKeysRef = useRef<(string | number)[]>([]);

  return useMemo(() => {
    const currentKeys = data.map(keyExtractor);
    const prevKeys = prevKeysRef.current;

    const added = currentKeys.filter((key) => !prevKeys.includes(key));
    const removed = prevKeys.filter((key) => !currentKeys.includes(key));
    const changed = currentKeys.filter(
      (key) =>
        prevKeys.includes(key) &&
        data.find((_, index) => keyExtractor(_, index) === key) !==
          prevDataRef.current.find((_, index) => keyExtractor(_, index) === key)
    );

    prevDataRef.current = data;
    prevKeysRef.current = currentKeys;

    return {
      added,
      removed,
      changed,
      hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
    };
  }, [data, keyExtractor]);
};

// 条件付きメモ化フック
export const useConditionalMemo = <T>(
  factory: () => T,
  deps: React.DependencyList,
  condition: boolean
): T => {
  return useMemo(
    () => {
      if (condition) {
        return factory();
      }
      return factory();
    },
    condition ? deps : []
  );
};

// 遅延初期化フック
export const useLazyInitialization = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const valueRef = useRef<T | null>(null);

  return useMemo(() => {
    if (valueRef.current === null) {
      valueRef.current = factory();
    }
    return valueRef.current;
  }, deps);
};

// バッチ更新フック
export const useBatchUpdate = <T>(initialState: T, batchSize: number = 10) => {
  const [state, setState] = useState<T>(initialState);
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const batchUpdate = useCallback((updates: T[]) => {
    batchRef.current.push(...updates);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (batchRef.current.length > 0) {
        setState((prevState) => {
          // バッチ処理のロジックをここに実装
          return {
            ...prevState,
            ...batchRef.current[batchRef.current.length - 1],
          };
        });
        batchRef.current = [];
      }
    }, 16); // 約60fps
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};

// パフォーマンス最適化のための設定
export const usePerformanceConfig = () => {
  return useMemo(
    () => ({
      // キャッシュの有効期限（ミリ秒）
      cacheDuration: 5 * 60 * 1000, // 5分

      // デバウンスのデフォルト遅延（ミリ秒）
      defaultDebounceDelay: 300,

      // スロットリングのデフォルト遅延（ミリ秒）
      defaultThrottleDelay: 100,

      // ページネーションのデフォルトサイズ
      defaultPageSize: 20,

      // 最大ページサイズ
      maxPageSize: 100,

      // 仮想化の閾値
      virtualizationThreshold: 100,

      // メモ化の有効期限（ミリ秒）
      memoizationExpiry: 2 * 60 * 1000, // 2分
    }),
    []
  );
};

// パフォーマンスメトリクスフック
export const usePerformanceMetrics = () => {
  const metricsRef = useRef<{
    renderCount: number;
    averageRenderTime: number;
    totalRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    lastRenderTime: 0,
  });

  const startRender = useCallback(() => {
    metricsRef.current.lastRenderTime = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - metricsRef.current.lastRenderTime;
    metricsRef.current.renderCount += 1;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.averageRenderTime =
      metricsRef.current.totalRenderTime / metricsRef.current.renderCount;
  }, []);

  const getMetrics = useCallback(
    () => ({
      ...metricsRef.current,
      reset: () => {
        metricsRef.current = {
          renderCount: 0,
          averageRenderTime: 0,
          totalRenderTime: 0,
          lastRenderTime: 0,
        };
      },
    }),
    []
  );

  return {
    startRender,
    endRender,
    getMetrics,
  };
};
