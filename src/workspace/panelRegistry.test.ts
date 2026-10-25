import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import registry from '../../docs/product/workspace-v2/PANEL_REGISTRY.json';
import { WORKSPACE_MODES, WORKSPACE_REGIONS, WorkspacePreview } from './WorkspacePreview';

describe('Workspace V2 panel and data ownership constitution', () => {
  it('uses exactly Character/Motion/Scene, one shared center, inspector and bottom dock', () => {
    expect(WORKSPACE_MODES).toEqual(['character', 'motion', 'scene']);
    expect(WORKSPACE_REGIONS).toEqual(['header', 'left', 'center', 'right', 'bottom', 'diagnostics']);
    expect(registry.modes).toEqual(WORKSPACE_MODES);
    expect(Object.values(registry.layout).sort()).toEqual([
      'mode-switcher','project-assets','primary-editor','selection-inspector','take-transport','research-drawer',
    ].sort());
    const ids = registry.slots.map(slot => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
    const owners = registry.slots.map(slot => slot.owner);
    expect(owners.every(owner => !!owner)).toBe(true);
    const centers = registry.slots.filter(slot => slot.region === 'center');
    expect(centers.map(x => x.mode)).toEqual(['character','motion','scene']);
  });
  it('does not append independent experiment panels or fake a completed organ graph', () => {
    const html = renderToStaticMarkup(createElement(WorkspacePreview));
    expect((html.match(/data-region="center"/g)||[]).length).toBe(1);
    expect((html.match(/data-region="right"/g)||[]).length).toBe(1);
    expect((html.match(/data-region="bottom"/g)||[]).length).toBe(1);
    expect((html.match(/role="tab"/g)||[]).length).toBe(3);
    expect(html).toContain('グラフ編集：未実装');
    expect(html).toContain('ノード選択のみ可能');
    expect(html).not.toContain('CC-B1身体編集実験入口');
    expect(html).not.toContain('WG2 · 身体固有の波動伝播から声を新規計算');
    expect(html).toContain('disabled=""');
  });
});
