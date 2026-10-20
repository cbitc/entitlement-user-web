import { useEffect, useState } from 'react';
import { listCatalog } from './api';
import type { CatalogPlan, CatalogProduct } from './types';

/** 目录索引：产品与其套餐，供订单/订阅页补全可读名称与周期。 */
export interface CatalogIndex {
  readonly products: ReadonlyArray<CatalogProduct>;
  readonly productByCode: ReadonlyMap<string, CatalogProduct>;
  readonly planByKey: ReadonlyMap<string, CatalogPlan>;
}

const EMPTY_INDEX: CatalogIndex = {
  products: [],
  productByCode: new Map(),
  planByKey: new Map(),
};

const planKey = (product: string, plan: string) => `${product}/${plan}`;

const toIndex = (products: ReadonlyArray<CatalogProduct>): CatalogIndex => ({
  products,
  productByCode: new Map(products.map((product) => [product.code, product])),
  planByKey: new Map(
    products.flatMap((product) =>
      product.plans.map(
        (plan) => [planKey(product.code, plan.code), plan] as const,
      ),
    ),
  ),
});

let indexPromise: Promise<CatalogIndex> | null = null;

/**
 * 拉取目录索引并缓存。目录在同一会话内变化很少，多页共用一次请求；
 * 失败时不缓存，下一次调用会重试。
 */
export const loadCatalogIndex = (): Promise<CatalogIndex> => {
  if (!indexPromise) {
    indexPromise = listCatalog()
      .then((data) => toIndex(data.products))
      .catch((error: unknown) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
};

/**
 * 页面侧只读目录索引。目录不可用时返回空索引，由调用方回退为代码，
 * 不打断主流程。
 */
export const useCatalogIndex = (): CatalogIndex => {
  const [index, setIndex] = useState<CatalogIndex>(EMPTY_INDEX);

  useEffect(() => {
    let cancelled = false;
    loadCatalogIndex()
      .then((loaded) => {
        if (!cancelled) {
          setIndex(loaded);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return index;
};

/** 取产品的展示名称；目录中缺失时回退为产品代码。 */
export const displayProductName = (
  index: CatalogIndex,
  code: string,
): string => index.productByCode.get(code)?.displayName ?? code;

/** 按 (产品, 套餐) 查找目录中的定价信息；缺失时返回 undefined。 */
export const findCatalogPlan = (
  index: CatalogIndex,
  product: string,
  plan: string,
): CatalogPlan | undefined => index.planByKey.get(planKey(product, plan));
