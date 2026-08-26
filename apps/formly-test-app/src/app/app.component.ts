import { Component } from '@angular/core';

import { FormHost } from './form-host.js';
import type { TestFormDefinition } from './form-registry/form-definition.js';
import { TestFormRegistry } from './form-registry/form-registry.js';

type WorkbenchView = 'contract' | 'fixture' | 'agent';

const FEATURED_FORM_IDS = new Set([
  'applicant.profile',
  'operations.equipment-inspection',
  'edge.opaque-behavior',
]);

@Component({
  selector: 'test-app-root',
  standalone: false,
  template: `
    <header class="utility-header">
      <div class="wordmark">
        <span class="wordmark-mark" aria-hidden="true">FAC</span>
        <span>Formly Contract</span>
      </div>
      <div class="build-status" aria-label="Analyzer status">
        <span>schema v0.3</span>
        <span class="status-signal">declared extraction</span>
      </div>
    </header>

    <section class="product-intro">
      <div>
        <h1>Formly in. Agent-readable contract out.</h1>
        <p>
          Select a synthetic form and inspect the stable IDs, model paths,
          evidence, locators, and explicit unknowns that an agent can consume.
          The analyzer never invents selectors or calls arbitrary application
          functions during declared extraction.
        </p>
      </div>
      <ol class="analysis-pipeline" aria-label="Contract analysis pipeline">
        <li><span>Input</span><strong>Formly factory</strong></li>
        <li><span>Build step</span><strong>Allowlisted projection</strong></li>
        <li><span>Artifact</span><strong>Contract v0.3</strong></li>
        <li><span>Consumer</span><strong>Agent or MCP layer</strong></li>
      </ol>
    </section>

    <main class="workbench-shell">
      <aside class="form-index" aria-label="Synthetic analyzer inputs">
        <header>
          <h2>Analyzer inputs</h2>
          <p>Fresh factories. Synthetic models. No workplace data.</p>
        </header>

        <section class="catalog-group" aria-labelledby="demo-path-heading">
          <h3 id="demo-path-heading">Demo path</h3>
          @for (definition of featuredDefinitions; track definition.id) {
            <button
              type="button"
              [class.is-active]="definition.id === host.activeDefinition?.id"
              [attr.data-form-id]="definition.id"
              (click)="selectForm(definition.id)"
            >
              <span>{{ definition.title }}</span>
              <small>{{ definition.id }}</small>
            </button>
          }
        </section>

        <details class="catalog-more">
          <summary>Full fixture corpus</summary>
          <div class="catalog-group catalog-group--compact">
            @for (definition of additionalDefinitions; track definition.id) {
              <button
                type="button"
                [class.is-active]="definition.id === host.activeDefinition?.id"
                [attr.data-form-id]="definition.id"
                (click)="selectForm(definition.id)"
              >
                <span>{{ definition.title }}</span>
                <small>{{ definition.id }}</small>
              </button>
            }
          </div>
        </details>
      </aside>

      @if (host.activeDefinition; as definition) {
        @if (host.contract; as contract) {
          <article
            class="contract-workbench"
            [attr.data-active-form]="definition.id"
          >
            <header class="contract-heading">
              <div>
                <div class="contract-id-line">
                  <code>{{ definition.id }}</code>
                  <span>{{ contract.schemaVersion }}</span>
                </div>
                <h2>{{ definition.title }}</h2>
                <p>{{ definition.description }}</p>
              </div>
              <dl class="contract-metrics">
                <div><dt>Nodes</dt><dd>{{ host.contractMetrics.nodes }}</dd></div>
                <div><dt>Controls</dt><dd>{{ host.contractMetrics.controls }}</dd></div>
                <div><dt>Exact locators</dt><dd>{{ host.contractMetrics.exactLocators }}</dd></div>
                <div><dt>Diagnostics</dt><dd>{{ host.contractMetrics.diagnostics }}</dd></div>
              </dl>
            </header>

            <div class="contract-hash">
              <span>Content-addressed artifact</span>
              <code>{{ contract.contentHash }}</code>
            </div>

            <nav class="view-tabs" role="tablist" aria-label="Workbench views">
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="activeView === 'contract'"
                [class.is-active]="activeView === 'contract'"
                (click)="setView('contract')"
              >Normalized contract</button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="activeView === 'fixture'"
                [class.is-active]="activeView === 'fixture'"
                (click)="setView('fixture')"
              >Rendered evidence</button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="activeView === 'agent'"
                [class.is-active]="activeView === 'agent'"
                (click)="setView('agent')"
              >Agent → Playwright</button>
            </nav>

            @switch (activeView) {
              @case ('contract') {
                <div class="contract-view" role="tabpanel">
                  <section class="semantic-tree" aria-labelledby="tree-heading">
                    <header class="panel-heading">
                      <div>
                        <h3 id="tree-heading">Semantic tree</h3>
                        <p>Ordered nodes, cumulative paths, and evidence.</p>
                      </div>
                      <span>{{ host.contractRows.length }} normalized nodes</span>
                    </header>

                    <div class="tree-header" aria-hidden="true">
                      <span>Node</span><span>Type</span><span>Evidence</span>
                    </div>
                    <ol class="node-list">
                      @for (row of host.contractRows; track row.id) {
                        <li [style.--node-depth]="row.depth">
                          <div class="node-identity">
                            <strong>{{ row.label }}</strong>
                            <code>{{ row.modelPath }}</code>
                            <small>{{ row.id }}</small>
                          </div>
                          <div class="node-type">
                            <span>{{ row.kind }}</span>
                            <small>{{ row.semanticType }}</small>
                          </div>
                          <div class="node-evidence">
                            <span>declared</span>
                            @if (row.primaryLocator; as locator) {
                              <code>{{ locator.strategy }}:{{ locator.value }}</code>
                            } @else {
                              <small>no reliable locator</small>
                            }
                            @if (row.diagnosticCount > 0) {
                              <strong>{{ row.diagnosticCount }} diagnostic</strong>
                            }
                          </div>
                        </li>
                      }
                    </ol>

                    <section class="diagnostic-section" aria-labelledby="diagnostics-heading">
                      <div class="panel-heading">
                        <div>
                          <h3 id="diagnostics-heading">Explicit unknowns</h3>
                          <p>Executable or lossy behavior is reported, not guessed.</p>
                        </div>
                      </div>
                      @if (contract.diagnostics.length > 0) {
                        <ul class="diagnostic-list">
                          @for (diagnostic of contract.diagnostics; track $index) {
                            <li>
                              <code>{{ diagnostic.code }}</code>
                              <p>{{ diagnostic.message }}</p>
                              <small>{{ diagnostic.nodeId ?? 'form-level diagnostic' }}</small>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p class="clean-diagnostic">
                          No diagnostics for this declared synthetic configuration.
                        </p>
                      }
                    </section>
                  </section>

                  <section class="contract-json" aria-labelledby="json-heading">
                    <header class="panel-heading">
                      <div>
                        <h3 id="json-heading">Generated artifact</h3>
                        <p>Portable JSON for CI, agents, or a read-only query layer.</p>
                      </div>
                      <span>canonical shape</span>
                    </header>
                    <pre>{{ host.contractJson }}</pre>
                  </section>
                </div>
              }

              @case ('fixture') {
                <div class="fixture-view" role="tabpanel">
                  <div class="fixture-context">
                    <h3>Browser rendering is supporting evidence.</h3>
                    <p>
                      Use the form to validate the synthetic fixture. The
                      normalized artifact stays the primary product, and this
                      browser state is not silently relabelled as observed contract
                      evidence.
                    </p>
                    <ul class="feature-list" aria-label="Fixture features">
                      @for (feature of definition.features; track feature) {
                        <li>{{ feature }}</li>
                      }
                    </ul>
                  </div>
                  <form class="rendered-form" [formGroup]="host.form">
                    <formly-form
                      [form]="host.form"
                      [fields]="host.fields"
                      [model]="host.model"
                      [options]="host.options"
                    />
                  </form>
                  <details class="model-inspector">
                    <summary>Inspect synthetic model</summary>
                    <pre>{{ host.model | json }}</pre>
                  </details>
                </div>
              }

              @case ('agent') {
                <div class="agent-view" role="tabpanel">
                  <section class="locator-walkthrough" aria-labelledby="locator-walkthrough-heading">
                    <header class="panel-heading">
                      <div>
                        <h3 id="locator-walkthrough-heading">One field, end to end</h3>
                        <p>
                          Every value below is derived from the selected synthetic
                          contract. The agent chooses semantic intent; a driver
                          owns locator selection and Playwright syntax.
                        </p>
                      </div>
                      <span>declared evidence</span>
                    </header>

                    @if (host.locatorDemo.available) {
                      <div class="locator-flow">
                        <article>
                          <span>01 · Formly declaration</span>
                          <h4>Allowlisted input facts</h4>
                          <pre>{{ host.locatorDemo.declarationJson }}</pre>
                        </article>
                        <article>
                          <span>02 · Static extraction</span>
                          <h4>Normalized locator candidates</h4>
                          <pre>{{ host.locatorDemo.normalizedJson }}</pre>
                        </article>
                        <article>
                          <span>03 · Agent output</span>
                          <h4>Typed intent, no selector</h4>
                          <pre>{{ host.locatorDemo.testIntentJson }}</pre>
                        </article>
                        <article>
                          <span>04 · Driver output</span>
                          <h4>Illustrative Playwright</h4>
                          <pre>{{ host.locatorDemo.playwrightCode }}</pre>
                        </article>
                      </div>
                      <p class="roadmap-note">
                        Steps 01–02 are implemented now. Steps 03–04 show the
                        intended post-MVP test-intent and deterministic driver
                        boundary; locator uniqueness and browser parity still need
                        runtime validation.
                      </p>
                    } @else {
                      <p class="locator-empty">
                        This form deliberately declares no exact test locator.
                        Select Applicant profile to see the extraction and
                        Playwright handoff path.
                      </p>
                    }
                  </section>
                  <section class="agent-explanation">
                    <h3>Give the agent facts, not Formly internals.</h3>
                    <p>
                      A read-only MCP server or another agent tool can index the
                      immutable artifact and return small, typed slices. It does
                      not need to load Angular, execute the factory, or invent a
                      selector at query time.
                    </p>
                    <ol>
                      <li>Pin the form ID and content hash.</li>
                      <li>Resolve intent to stable node IDs and model paths.</li>
                      <li>Use only evidence-backed locator candidates.</li>
                      <li>Surface diagnostics when reliable evidence is absent.</li>
                    </ol>
                    <p class="boundary-note">
                      Preview only: no MCP server is running in this application.
                    </p>
                  </section>
                  <section class="agent-payload" aria-labelledby="agent-payload-heading">
                    <header class="panel-heading">
                      <div>
                        <h3 id="agent-payload-heading">Agent context slice</h3>
                        <p>Derived only from the selected generated contract.</p>
                      </div>
                    </header>
                    <pre>{{ host.agentHandoff }}</pre>
                  </section>
                </div>
              }
            }
          </article>
        }
      }
    </main>

    <footer class="scope-footer">
      <p>
        Synthetic repository data only · declared + resolved evidence available ·
        browser observation and MCP query surfaces remain roadmap work
      </p>
    </footer>
  `,
})
export class AppComponent {
  readonly host: FormHost;
  readonly featuredDefinitions: readonly TestFormDefinition[];
  readonly additionalDefinitions: readonly TestFormDefinition[];
  activeView: WorkbenchView = 'contract';

  constructor(registry: TestFormRegistry) {
    this.host = new FormHost(registry);
    this.featuredDefinitions = this.host.definitions.filter(({ id }) =>
      FEATURED_FORM_IDS.has(id),
    );
    this.additionalDefinitions = this.host.definitions.filter(
      ({ id }) => !FEATURED_FORM_IDS.has(id),
    );

    if (this.featuredDefinitions.some(({ id }) => id === 'applicant.profile')) {
      this.host.select('applicant.profile');
    }
  }

  selectForm(id: string): void {
    this.host.select(id);
    this.activeView = 'contract';
  }

  setView(view: WorkbenchView): void {
    this.activeView = view;
  }
}
