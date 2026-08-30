import {
  BehaviorSubject,
  Observable,
  Subject,
  asyncScheduler,
  from,
  map,
  of,
} from "rxjs";

import { workspaceOf } from "./rxjs-barrel.js";

export interface Field {
  readonly key: string;
}

export interface Option<T> {
  readonly label: string;
  readonly value: T;
  readonly disabled?: boolean;
}

export interface PolicySearchResult {
  readonly id: string;
  readonly displayName: string;
}

export type ProductOptions = Observable<readonly Option<string>[]>;

export class ProductSubject<T> extends BehaviorSubject<T> {}

export interface IndexingFormConfigOptions {
  readonly reviewFn: () => boolean;
  readonly productChangeFn: (field: Field) => void;
  readonly productOptionsFn: (
    field: Field
  ) => Observable<readonly Option<string>[]>;
  readonly ownerFilterFn: (
    query: string
  ) => Observable<Observable<any[]> | readonly PolicySearchResult[]>;
  readonly staticOptions: readonly Option<"alpha" | "beta">[];
  readonly initialOptions$: ProductOptions;
  readonly productSubject$: ProductSubject<Option<number>>;
  readonly mode: "create" | "review";
  readonly reactiveFlag: boolean;
  readonly service: { readonly load: () => readonly string[] };
  readonly templateRef: { readonly elementRef: object };
  readonly opaqueUnknown: unknown;
  readonly unsafeAny: any;
}

export interface FieldConfig {
  readonly key?: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly expressions?: Readonly<Record<string, unknown>>;
}

export function IndexingFormConfig(
  options: IndexingFormConfigOptions
): readonly FieldConfig[] {
  const modeLabel = options.mode === "review" ? "Review" : "Create";
  const filtered = options.staticOptions.filter(
    (candidate) => candidate.value !== "beta"
  );
  const serviceOptions = options.service.load();

  return [
    {
      key: "product",
      props: {
        label: modeLabel,
        options: filtered,
        serviceOptions,
        initialOptions$: options.initialOptions$,
        productSubject$: options.productSubject$,
        templateRef: options.templateRef,
        change: (field: Field) => options.productChangeFn(field),
      },
      expressions: {
        "props.readonly": () => options.reviewFn(),
        "props.options": (field: Field) => options.productOptionsFn(field),
        "props.ownerOptions": (query: string) => options.ownerFilterFn(query),
        "props.opaque": () => options.opaqueUnknown,
        "props.anything": () => options.unsafeAny,
        "props.reactiveFlag": () =>
          options.reactiveFlag ? "enabled" : "disabled",
      },
    },
  ];
}

function storeUnknownCallback<T>(callback: T): T {
  return callback;
}

export function UsageBoundaryFixture(
  options: IndexingFormConfigOptions,
  rows: readonly Field[]
): Readonly<Record<string, unknown>> {
  const { reviewFn } = options;
  const parameterAlias = options;
  let mutableAlias = options;
  mutableAlias = parameterAlias;
  const propertyAlias = options.mode;
  const computedKey: keyof IndexingFormConfigOptions = "mode";
  const computed = options[computedKey];
  const immediate = (() => options.reviewFn())();
  const mapped = rows.map((row) => options.productChangeFn(row));
  const unknownCallbackConsumer = storeUnknownCallback((field: Field) =>
    options.productOptionsFn(field)
  );
  const getterHolder = {
    get value(): boolean {
      return options.reviewFn();
    },
  };

  return {
    reviewFn,
    parameterAlias,
    mutableAlias,
    propertyAlias,
    computed,
    immediate,
    mapped,
    unknownCallbackConsumer,
    getterHolder,
    storedScalarRead: () => options.reactiveFlag,
    storedCallback: (field: Field) => options.productChangeFn(field),
  };
}

declare const initialOptions: ProductOptions;
declare const productSubject: ProductSubject<Option<number>>;
declare const templateRef: { readonly elementRef: object };

export const contextualCallsite = IndexingFormConfig({
  reviewFn: () => false,
  productChangeFn: (field) => {
    void field.key;
  },
  productOptionsFn: (field) =>
    of([{ label: field.key, value: field.key }] as const),
  ownerFilterFn: () => of([] as readonly PolicySearchResult[]),
  staticOptions: [
    { label: "Alpha", value: "alpha" },
    { label: "Beta", value: "beta", disabled: true },
  ],
  initialOptions$: initialOptions,
  productSubject$: productSubject,
  mode: "create",
  reactiveFlag: false,
  service: { load: () => [] },
  templateRef,
  opaqueUnknown: undefined,
  unsafeAny: undefined,
});

export const aliased$ = initialOptions;
export const subject$ = new Subject<Option<boolean>>();
export const subclass$ = new ProductSubject<Option<number>>({
  label: "One",
  value: 1,
});
export const union$ = null as unknown as
  | Observable<Option<"left">>
  | Observable<Option<"right">>;
export const nullable$ = null as unknown as Observable<Option<string> | null>;
export const literalChoiceArray$ = null as unknown as Observable<
  readonly Option<"open" | "closed">[]
>;
export const unknown$ = null as unknown as Observable<unknown>;
export const any$ = null as unknown as Observable<any>;
export const objectNestedAny$ = null as unknown as Observable<{
  readonly payload: any;
}>;
export const observableLike = {
  subscribe(next: (value: Option<string>) => void): void {
    next({ label: "structural only", value: "not-rxjs" });
  },
};

function preserve<T>(source: Observable<T>): Observable<T> {
  return source;
}

export const genericResult$ = preserve(
  of({ label: "Generic", value: 42 } as const)
);
export const mapped$ = of(1, 2).pipe(
  map((value) => ({ label: String(value), value } as const))
);

export const directOf$ = of(
  { label: "Open", value: "open" } as const,
  { label: "Closed", value: "closed", disabled: true } as const
);
export const barrelOf$ = workspaceOf({
  label: "Barrel",
  value: "barrel",
} as const);
export const wholeArrayOf$ = of([
  { label: "One", value: 1 },
  { label: "Two", value: 2 },
] as const);
export const fromTuple$ = from([
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
] as const);

const importedOrComputedOption: Option<string> = {
  label: "Computed",
  value: String(Date.now()),
};

export const identifierOf$ = of(importedOrComputedOption);
export const promiseFrom$ = from(
  Promise.resolve({ label: "Later", value: "later" } as const)
);
export const iterableFrom$ = from(
  new Set([{ label: "Iterable", value: "iterable" }] as const)
);
export const scheduledOf$ = of(
  { label: "Scheduled", value: "scheduled" } as const,
  asyncScheduler
);
export const nonJsonNumberOf$ = of(1e400);
export const protoKeyOf$ = of({ __proto__: null });
export const numericKeyOf$ = of({ 1: "one" });
export const numericExponentKeyOf$ = of({ 1e2: "one-hundred" });
export const mappedFinite$ = of("one", "two").pipe(
  map((value) => ({ label: value.toUpperCase(), value }))
);
export const initialBehavior$ = new BehaviorSubject({
  label: "Initial",
  value: "initial",
} as const);
export const opaqueProducer$ = new Observable<Option<string>>((subscriber) => {
  subscriber.next({ label: "Opaque", value: "opaque" });
  subscriber.complete();
});

function fakeOf<T>(value: T): T {
  return value;
}

export const sameSpellingButNotRxjs = fakeOf({
  label: "Not RxJS",
  value: "fake",
} as const);
