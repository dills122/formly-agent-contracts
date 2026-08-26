import {
  AST,
  ASTWithSource,
  ImplicitReceiver,
  KeyedRead,
  LiteralPrimitive,
  parseTemplate,
  PropertyRead,
  RecursiveAstVisitor,
  SafeKeyedRead,
  SafePropertyRead,
  TmplAstBoundAttribute,
  TmplAstBoundEvent,
  TmplAstBoundText,
  TmplAstElement,
  TmplAstForLoopBlock,
  TmplAstRecursiveVisitor,
  tmplAstVisitAll,
} from '@angular/compiler';
import { reflectComponentType, type Type } from '@angular/core';
import type { FormlyConfig, FormlyFieldConfig } from '@ngx-formly/core';
import ts from 'typescript';

export interface RuntimeComponentObservation {
  selector: string;
  standalone: boolean;
  inputs: string[];
  outputs: string[];
  ngContentSelectors: string[];
}

export interface FormlyTypeInventoryEntry {
  formlyType: string;
  componentName?: string;
  component?: RuntimeComponentObservation;
  extends?: string;
  wrappers: string[];
  declaredDefaultOptionKeys: string[];
  effectiveDefaultOptionKeys: string[];
  declaredDefaultPropKeys: string[];
  effectiveDefaultPropKeys: string[];
}

export interface TemplateElementObservation {
  name: string;
  literalAttributes: Record<string, string>;
  boundAttributes: string[];
}

export interface TemplateEventObservation {
  element: string;
  event: string;
  handler: string;
}

export interface StaticComponentObservation {
  className: string;
  selector: string;
  elements: TemplateElementObservation[];
  events: TemplateEventObservation[];
  propertyReads: string[];
  parseErrors: string[];
}

export interface AngularSourceAnalysisOptions {
  loadTemplate?: (templateUrl: string, containingFile: string) => string;
}

export interface InteractionCandidate {
  operation?: 'check' | 'fill' | 'click';
  controlRole?: string;
  optionRole?: string;
  possibleValues?: {
    status: 'runtime-dependent';
  };
}

export interface InteractionScaffold {
  formlyType: string;
  componentSelector: string;
  evidence: 'derived';
  candidate: InteractionCandidate;
  observedProps: string[];
  reviewRequired: true;
  unknowns: string[];
}

export interface DeclaredInteractionProfile {
  containerRole?: string;
  optionRole?: string;
  operation: string;
}

export interface RenderedRoleSurface {
  roles: Record<string, number>;
}

export interface SurfaceMismatch {
  code: 'container-role-not-observed' | 'option-role-not-observed';
  expected: string;
  observed: string[];
}

export function reflectAngularComponent(
  component: Type<unknown>,
): RuntimeComponentObservation {
  const mirror = reflectComponentType(component);
  if (mirror == null) {
    throw new Error(`Angular component metadata was not available for ${component.name}.`);
  }

  return {
    selector: mirror.selector,
    standalone: mirror.isStandalone,
    inputs: mirror.inputs.map(({ propName }) => propName).sort(),
    outputs: mirror.outputs.map(({ propName }) => propName).sort(),
    ngContentSelectors: [...mirror.ngContentSelectors],
  };
}

export function inventoryFormlyTypes(
  config: Pick<FormlyConfig, 'getMergedField' | 'getType' | 'types'>,
): FormlyTypeInventoryEntry[] {
  return Object.entries(config.types)
    .map(([formlyType, type]) => {
      const declaredExtends = type.extends;
      const declaredDefaultOptionKeys = Object.keys(
        type.defaultOptions ?? {},
      ).sort();
      const declaredProps: unknown = type.defaultOptions?.props;
      const effective = config.getType(formlyType);
      const component = effective.component;
      const mergedField: FormlyFieldConfig = {
        type: formlyType,
        options: {},
      };
      config.getMergedField(mergedField);
      const effectiveProps: unknown = mergedField.props;
      return {
        formlyType,
        ...(component == null
          ? {}
          : {
              componentName: component.name,
              component: reflectAngularComponent(component),
            }),
        ...(declaredExtends == null ? {} : { extends: declaredExtends }),
        wrappers: [...(effective.wrappers ?? [])],
        declaredDefaultOptionKeys,
        effectiveDefaultOptionKeys: Object.keys(mergedField)
          .filter((key) => !['options', 'type', 'wrappers'].includes(key))
          .sort(),
        declaredDefaultPropKeys:
          typeof declaredProps === 'object' && declaredProps !== null
            ? Object.keys(declaredProps).sort()
            : [],
        effectiveDefaultPropKeys:
          typeof effectiveProps === 'object' && effectiveProps !== null
            ? Object.keys(effectiveProps).sort()
            : [],
      };
    })
    .sort((left, right) => left.formlyType.localeCompare(right.formlyType));
}

function decoratorCall(
  declaration: ts.ClassDeclaration,
  decoratorName: string,
): ts.CallExpression | undefined {
  if (!ts.canHaveDecorators(declaration)) {
    return undefined;
  }

  for (const decorator of ts.getDecorators(declaration) ?? []) {
    if (
      ts.isCallExpression(decorator.expression) &&
      ts.isIdentifier(decorator.expression.expression) &&
      decorator.expression.expression.text === decoratorName
    ) {
      return decorator.expression;
    }
  }

  return undefined;
}

function objectProperty(
  expression: ts.Expression,
  propertyName: string,
): ts.Expression | undefined {
  if (!ts.isObjectLiteralExpression(expression)) {
    return undefined;
  }

  for (const property of expression.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === propertyName) ||
        (ts.isStringLiteral(property.name) && property.name.text === propertyName))
    ) {
      return property.initializer;
    }
  }

  return undefined;
}

function literalText(expression: ts.Expression | undefined): string | undefined {
  return expression != null &&
    (ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : undefined;
}

function typeScriptReadPath(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (node.kind === ts.SyntaxKind.ThisKeyword) {
    return 'this';
  }
  if (ts.isPropertyAccessExpression(node)) {
    const receiver = typeScriptReadPath(node.expression);
    return receiver == null ? undefined : `${receiver}.${node.name.text}`;
  }
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression != null &&
    ts.isStringLiteral(node.argumentExpression)
  ) {
    const receiver = typeScriptReadPath(node.expression);
    return receiver == null
      ? undefined
      : `${receiver}.${node.argumentExpression.text}`;
  }
  return undefined;
}

function collectTypeScriptPropertyReads(
  declaration: ts.ClassDeclaration,
  propertyReads: Set<string>,
): void {
  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const path = typeScriptReadPath(node)?.replace(/^this\./u, '');
      if (path?.startsWith('props.') === true) {
        propertyReads.add(path);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(declaration);
}

function angularReadPath(ast: AST): string | undefined {
  if (ast instanceof ASTWithSource) {
    const unwrapped: unknown = ast.ast;
    return unwrapped instanceof AST ? angularReadPath(unwrapped) : undefined;
  }
  if (ast instanceof ImplicitReceiver) {
    return '';
  }
  if (ast instanceof PropertyRead || ast instanceof SafePropertyRead) {
    const receiver = angularReadPath(ast.receiver);
    return receiver == null || receiver === ''
      ? ast.name
      : `${receiver}.${ast.name}`;
  }
  if (ast instanceof KeyedRead || ast instanceof SafeKeyedRead) {
    const receiver = angularReadPath(ast.receiver);
    if (receiver == null || !(ast.key instanceof LiteralPrimitive)) {
      return undefined;
    }
    return `${receiver}.${String(ast.key.value)}`;
  }
  return undefined;
}

class AngularPropertyReadCollector extends RecursiveAstVisitor {
  constructor(private readonly propertyReads: Set<string>) {
    super();
  }

  override visitPropertyRead(ast: PropertyRead, context: unknown): unknown {
    this.record(ast);
    return super.visitPropertyRead(ast, context);
  }

  override visitSafePropertyRead(
    ast: SafePropertyRead,
    context: unknown,
  ): unknown {
    this.record(ast);
    return super.visitSafePropertyRead(ast, context);
  }

  override visitKeyedRead(ast: KeyedRead, context: unknown): unknown {
    this.record(ast);
    return super.visitKeyedRead(ast, context);
  }

  override visitSafeKeyedRead(ast: SafeKeyedRead, context: unknown): unknown {
    this.record(ast);
    return super.visitSafeKeyedRead(ast, context);
  }

  private record(ast: AST): void {
    const path = angularReadPath(ast);
    if (path?.startsWith('props.') === true) {
      this.propertyReads.add(path);
    }
  }
}

class TemplateObservationVisitor extends TmplAstRecursiveVisitor {
  private currentElement = '';

  constructor(
    private readonly elements: TemplateElementObservation[],
    private readonly events: TemplateEventObservation[],
    private readonly expressionVisitor: AngularPropertyReadCollector,
  ) {
    super();
  }

  override visitElement(element: TmplAstElement): void {
    this.elements.push({
      name: element.name,
      literalAttributes: Object.fromEntries(
        element.attributes.map(({ name, value }) => [name, value]),
      ),
      boundAttributes: element.inputs.map(({ name }) => name).sort(),
    });

    const parentElement = this.currentElement;
    this.currentElement = element.name;
    super.visitElement(element);
    this.currentElement = parentElement;
  }

  override visitBoundAttribute(attribute: TmplAstBoundAttribute): void {
    attribute.value.visit(this.expressionVisitor);
  }

  override visitBoundEvent(event: TmplAstBoundEvent): void {
    event.handler.visit(this.expressionVisitor);
    const handlerSource: unknown =
      event.handler instanceof ASTWithSource
        ? event.handler.source
        : '';
    this.events.push({
      element: this.currentElement,
      event: event.name,
      handler: typeof handlerSource === 'string' ? handlerSource.trim() : '',
    });
  }

  override visitBoundText(text: TmplAstBoundText): void {
    text.value.visit(this.expressionVisitor);
  }

  override visitForLoopBlock(block: TmplAstForLoopBlock): void {
    block.expression.visit(this.expressionVisitor);
    block.trackBy.visit(this.expressionVisitor);
    super.visitForLoopBlock(block);
  }
}

export function analyzeAngularComponentSource(
  sourceText: string,
  fileName: string,
  className: string,
  options: AngularSourceAnalysisOptions = {},
): StaticComponentObservation {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === className,
  );
  if (declaration == null) {
    throw new Error(`Class ${className} was not found in ${fileName}.`);
  }

  const componentDecorator = decoratorCall(declaration, 'Component');
  const metadata = componentDecorator?.arguments[0];
  if (metadata == null) {
    throw new Error(`Class ${className} does not have readable @Component metadata.`);
  }

  const selector = literalText(objectProperty(metadata, 'selector'));
  const inlineTemplate = literalText(objectProperty(metadata, 'template'));
  const templateUrl = literalText(objectProperty(metadata, 'templateUrl'));
  const template =
    inlineTemplate ??
    (templateUrl == null || options.loadTemplate == null
      ? undefined
      : options.loadTemplate(templateUrl, fileName));
  if (selector == null || template == null) {
    throw new Error(
      `Class ${className} must expose a literal selector and either an inline template or a loadable literal templateUrl.`,
    );
  }

  const parsed = parseTemplate(template, fileName, {
    preserveWhitespaces: false,
  });
  const elements: TemplateElementObservation[] = [];
  const events: TemplateEventObservation[] = [];
  const propertyReads = new Set<string>();
  const visitor = new TemplateObservationVisitor(
    elements,
    events,
    new AngularPropertyReadCollector(propertyReads),
  );
  tmplAstVisitAll(visitor, parsed.nodes);
  collectTypeScriptPropertyReads(declaration, propertyReads);

  return {
    className,
    selector,
    elements,
    events,
    propertyReads: [...propertyReads].sort(),
    parseErrors: (parsed.errors ?? []).map((error) => error.toString()),
  };
}

export function deriveInteractionScaffold(
  formlyType: string,
  runtime: RuntimeComponentObservation,
  source: StaticComponentObservation,
): InteractionScaffold {
  const candidate: InteractionCandidate = {};
  const unknowns = new Set<string>();
  if (source.parseErrors.length > 0) {
    return {
      formlyType,
      componentSelector: runtime.selector,
      evidence: 'derived',
      candidate,
      observedProps: source.propertyReads,
      reviewRequired: true,
      unknowns: ['template-parse-errors'],
    };
  }

  if (source.elements.some(({ name }) => name.includes('-'))) {
    unknowns.add('opaque-child-component');
  }
  const radioInput = source.elements.find(
    ({ name, literalAttributes }) =>
      name === 'input' && literalAttributes.type === 'radio',
  );
  const numberInput = source.elements.find(
    ({ name, literalAttributes }) =>
      name === 'input' && literalAttributes.type === 'number',
  );
  const radioButton = source.elements.find(
    ({ name, literalAttributes }) =>
      name === 'button' && literalAttributes.role === 'radio',
  );
  const radioButtonClick = source.events.some(
    ({ element, event }) => element === 'button' && event === 'click',
  );
  const radioInputWritesModel = radioInput?.boundAttributes.includes(
    'formControl',
  );
  const numberInputWritesModel = numberInput?.boundAttributes.includes(
    'formControl',
  );

  if (radioInput != null && radioInputWritesModel) {
    candidate.operation = 'check';
    candidate.optionRole = 'radio';
    unknowns.add('driver-binding');
    if (radioInput.boundAttributes.includes('value')) {
      candidate.possibleValues = { status: 'runtime-dependent' };
      unknowns.add('possible-values');
    }
  } else if (radioButton != null && radioButtonClick) {
    candidate.operation = 'click';
    candidate.optionRole = 'radio';
    unknowns.add('driver-binding');
    unknowns.add('interaction-codec');
    if (radioButton.boundAttributes.includes('value')) {
      candidate.possibleValues = { status: 'runtime-dependent' };
      unknowns.add('possible-values');
    }
  } else if (numberInput != null && numberInputWritesModel) {
    candidate.operation = 'fill';
    candidate.controlRole = 'spinbutton';
    unknowns.add('driver-binding');
  } else {
    unknowns.add('interaction-operation');
    if (radioInput != null || numberInput != null) {
      unknowns.add('model-binding');
    }
  }

  if (source.events.length > 1) {
    unknowns.add('interaction-operation');
    unknowns.add('component-parts');
  }

  return {
    formlyType,
    componentSelector: runtime.selector,
    evidence: 'derived',
    candidate,
    observedProps: source.propertyReads,
    reviewRequired: true,
    unknowns: [...unknowns].sort(),
  };
}

export function compareDeclaredProfileToRenderedSurface(
  profile: DeclaredInteractionProfile,
  rendered: RenderedRoleSurface,
): SurfaceMismatch[] {
  const observed = Object.entries(rendered.roles)
    .filter(([, count]) => count > 0)
    .map(([role]) => role)
    .sort();
  const mismatches: SurfaceMismatch[] = [];

  if (
    profile.containerRole != null &&
    (rendered.roles[profile.containerRole] ?? 0) === 0
  ) {
    mismatches.push({
      code: 'container-role-not-observed',
      expected: profile.containerRole,
      observed,
    });
  }
  if (
    profile.optionRole != null &&
    (rendered.roles[profile.optionRole] ?? 0) === 0
  ) {
    mismatches.push({
      code: 'option-role-not-observed',
      expected: profile.optionRole,
      observed,
    });
  }

  return mismatches;
}
