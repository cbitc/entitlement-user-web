import { useEffect, useState } from 'react';
import { listCatalog } from './api';

const EMPTY_NAMES: ReadonlyMap<string, string> = new Map();

/**
 * 许可证与订单只返回产品代码，这里用产品目录补上可读的产品名称。
 * 目录不可用时返回空表，由调用方回退为代码，不打断主流程。
 */
export const useProductNames = (): ReadonlyMap<string, string> => {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(EMPTY_NAMES);

  useEffect(() => {
    let cancelled = false;
    listCatalog()
      .then((catalog) => {
        if (cancelled) {
          return;
        }
        setNames(
          new Map(catalog.products.map((item) => [item.code, item.displayName])),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
};

/** 取产品的展示名称；目录中缺失时回退为产品代码。 */
export const displayProductName = (
  names: ReadonlyMap<string, string>,
  code: string,
): string => names.get(code) ?? code;
