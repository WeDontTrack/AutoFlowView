import * as vscode from 'vscode';

/** CSS custom property names injected on the webview root element */
export type FlowAppearanceVars = Record<string, string>;

type PresetId = 'default' | 'ocean' | 'slate' | 'rose';

const PRESETS: Record<PresetId, FlowAppearanceVars> = {
  default: {
    '--afv-primary-step-bg': '#e0f2fe',
    '--afv-primary-step-border': '#3b82f6',
    '--afv-primary-step-fg': '#1e3a5f',
    '--afv-external-step-bg': '#f1f5f9',
    '--afv-external-step-border': '#64748b',
    '--afv-external-step-fg': '#334155',
    '--afv-class-sub-fg': '#64748b',
    '--afv-param-badge-bg': '#fef3c7',
    '--afv-param-badge-fg': '#92400e',
    '--afv-param-badge-border': '#fcd34d',
    '--afv-parallel-bg': '#fff7ed',
    '--afv-parallel-fg': '#9a3412',
    '--afv-parallel-border': '#fdba74',
    '--afv-warn-bg': '#fef2f2',
    '--afv-warn-fg': '#991b1b',
    '--afv-warn-border': '#fecaca',
    '--afv-keys-label': '#555555',
    '--afv-super-bg': '#ede9fe',
    '--afv-super-fg': '#5b21b6',
    '--afv-super-border': '#a78bfa'
  },
  ocean: {
    '--afv-primary-step-bg': '#cffafe',
    '--afv-primary-step-border': '#0891b2',
    '--afv-primary-step-fg': '#164e63',
    '--afv-external-step-bg': '#ecfeff',
    '--afv-external-step-border': '#06b6d4',
    '--afv-external-step-fg': '#0e7490',
    '--afv-class-sub-fg': '#0f766e',
    '--afv-param-badge-bg': '#e0f2fe',
    '--afv-param-badge-fg': '#075985',
    '--afv-param-badge-border': '#7dd3fc',
    '--afv-parallel-bg': '#f0fdfa',
    '--afv-parallel-fg': '#115e59',
    '--afv-parallel-border': '#5eead4',
    '--afv-warn-bg': '#fff1f2',
    '--afv-warn-fg': '#9f1239',
    '--afv-warn-border': '#fda4af',
    '--afv-keys-label': '#0f766e',
    '--afv-super-bg': '#e0e7ff',
    '--afv-super-fg': '#3730a3',
    '--afv-super-border': '#818cf8'
  },
  slate: {
    '--afv-primary-step-bg': '#e2e8f0',
    '--afv-primary-step-border': '#475569',
    '--afv-primary-step-fg': '#0f172a',
    '--afv-external-step-bg': '#f8fafc',
    '--afv-external-step-border': '#94a3b8',
    '--afv-external-step-fg': '#1e293b',
    '--afv-class-sub-fg': '#64748b',
    '--afv-param-badge-bg': '#f1f5f9',
    '--afv-param-badge-fg': '#334155',
    '--afv-param-badge-border': '#cbd5e1',
    '--afv-parallel-bg': '#f1f5f9',
    '--afv-parallel-fg': '#334155',
    '--afv-parallel-border': '#94a3b8',
    '--afv-warn-bg': '#fef2f2',
    '--afv-warn-fg': '#7f1d1d',
    '--afv-warn-border': '#fca5a5',
    '--afv-keys-label': '#475569',
    '--afv-super-bg': '#ede9fe',
    '--afv-super-fg': '#4c1d95',
    '--afv-super-border': '#8b5cf6'
  },
  rose: {
    '--afv-primary-step-bg': '#ffe4e6',
    '--afv-primary-step-border': '#e11d48',
    '--afv-primary-step-fg': '#881337',
    '--afv-external-step-bg': '#fff1f2',
    '--afv-external-step-border': '#fb7185',
    '--afv-external-step-fg': '#9f1239',
    '--afv-class-sub-fg': '#be123c',
    '--afv-param-badge-bg': '#ffedd5',
    '--afv-param-badge-fg': '#9a3412',
    '--afv-param-badge-border': '#fdba74',
    '--afv-parallel-bg': '#fdf2f8',
    '--afv-parallel-fg': '#86198f',
    '--afv-parallel-border': '#e879f9',
    '--afv-warn-bg': '#fef2f2',
    '--afv-warn-fg': '#991b1b',
    '--afv-warn-border': '#fecaca',
    '--afv-keys-label': '#9f1239',
    '--afv-super-bg': '#fae8ff',
    '--afv-super-fg': '#86198f',
    '--afv-super-border': '#d946ef'
  }
};

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Keys allowed in `autoflowview.colors.custom` (values: hex color strings). */
const CUSTOM_KEY_TO_CSS_VAR: Record<string, string> = {
  primaryStepBackground: '--afv-primary-step-bg',
  primaryStepBorder: '--afv-primary-step-border',
  primaryStepForeground: '--afv-primary-step-fg',
  externalStepBackground: '--afv-external-step-bg',
  externalStepBorder: '--afv-external-step-border',
  externalStepForeground: '--afv-external-step-fg',
  declaringClassForeground: '--afv-class-sub-fg',
  paramBadgeBackground: '--afv-param-badge-bg',
  paramBadgeForeground: '--afv-param-badge-fg',
  paramBadgeBorder: '--afv-param-badge-border',
  parallelBannerBackground: '--afv-parallel-bg',
  parallelBannerForeground: '--afv-parallel-fg',
  parallelBannerBorder: '--afv-parallel-border',
  warningBackground: '--afv-warn-bg',
  warningForeground: '--afv-warn-fg',
  warningBorder: '--afv-warn-border',
  keysLabelForeground: '--afv-keys-label',
  superCallBackground: '--afv-super-bg',
  superCallForeground: '--afv-super-fg',
  superCallBorder: '--afv-super-border'
};

function isPresetId(s: string): s is PresetId {
  return s === 'default' || s === 'ocean' || s === 'slate' || s === 'rose';
}

function normalizeHex(input: string): string | undefined {
  const trimmedInput = input.trim();
  if (!trimmedInput || !trimmedInput.match(HEX_REGEX)) {
    return undefined;
  }
  return trimmedInput.startsWith('#') ? trimmedInput : `#${trimmedInput}`;
}

/**
 * Reads workspace settings and returns CSS variables for the flow webview.
 */
export function getFlowAppearanceVars(): FlowAppearanceVars {
  const cfg = vscode.workspace.getConfiguration('autoflowview');
  const useCustom = cfg.get<boolean>('colors.useCustom') ?? false;
  const presetRaw = cfg.get<string>('colors.preset') ?? 'default';
  const preset: PresetId = isPresetId(presetRaw) ? presetRaw : 'default';
  const base: FlowAppearanceVars = { ...PRESETS[preset] };

  if (!useCustom) {
    return base;
  }

  const custom = cfg.get<Record<string, unknown>>('colors.custom') ?? {};
  const out: FlowAppearanceVars = { ...base };
  for (const [key, val] of Object.entries(custom)) {
    const cssVar = CUSTOM_KEY_TO_CSS_VAR[key];
    if (!cssVar || typeof val !== 'string') {
      continue;
    }
    const hex = normalizeHex(val);
    if (hex) {
      out[cssVar] = hex;
    }
  }
  return out;
}
