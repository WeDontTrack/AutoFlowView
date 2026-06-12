export function getPreviewHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestNG Flow Preview</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --afv-primary-step-bg: #e0f2fe;
      --afv-primary-step-border: #3b82f6;
      --afv-primary-step-fg: #1e3a5f;
      --afv-external-step-bg: #f1f5f9;
      --afv-external-step-border: #64748b;
      --afv-external-step-fg: #334155;
      --afv-class-sub-fg: #64748b;
      --afv-param-badge-bg: #fef3c7;
      --afv-param-badge-fg: #92400e;
      --afv-param-badge-border: #fcd34d;
      --afv-parallel-bg: #fff7ed;
      --afv-parallel-fg: #9a3412;
      --afv-parallel-border: #fdba74;
      --afv-warn-bg: #fef2f2;
      --afv-warn-fg: #991b1b;
      --afv-warn-border: #fecaca;
      --afv-keys-label: #555555;
      --afv-super-bg: #ede9fe;
      --afv-super-fg: #5b21b6;
      --afv-super-border: #a78bfa;
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
      overflow-x: hidden;
    }
    .container { display: flex; flex-direction: column; height: 100%; min-height: 200px; }
    .header {
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h3 {
      margin: 0; font-size: 13px; font-weight: 600;
      color: var(--vscode-sideBarSectionHeader-foreground);
    }
    .toolbar-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    }
    .search-container {
      display: flex; align-items: center;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      overflow: hidden;
      transition: width 0.2s ease;
      width: 28px;
    }
    .search-container.expanded {
      width: 180px;
    }
    #btn-search-icon {
      background: transparent; border: none; color: var(--vscode-icon-foreground);
      padding: 4px 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      width: 28px; height: 24px;
    }
    #search-input {
      border: none; background: transparent; color: var(--vscode-input-foreground);
      width: 100%; padding: 4px 6px 4px 0; outline: none;
      display: none;
    }
    .search-container.expanded #search-input {
      display: block;
    }
    .toolbar-row button {
      padding: 4px 10px; font-size: 11px; cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 8px;
    }
    .toolbar-row button:hover { filter: brightness(1.06); }
    #class-filter {
      flex: 1 1 120px; min-width: 100px; max-width: 220px;
      padding: 4px 6px; font-size: 11px;
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 8px; cursor: pointer;
    }
    #file-select {
      width: 100%; padding: 6px 8px;
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px; font-size: 12px; cursor: pointer;
    }
    select:focus, input:focus, button:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
    .flow-container { flex: 1; overflow-y: auto; }
    .layer-row {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; justify-content: flex-start;
      margin: 4px 0;
    }
    .flow-step {
      flex: 1 1 140px; min-width: 120px; max-width: 100%;
      padding: 8px 10px; border-radius: 4px; cursor: default;
      font-size: 11px; transition: opacity 0.15s ease, filter 0.15s ease; word-wrap: break-word;
    }
    .flow-step.step {
      background-color: var(--afv-primary-step-bg); color: var(--afv-primary-step-fg);
      border-left: 4px solid var(--afv-primary-step-border);
    }
    .flow-step.external {
      background-color: var(--afv-external-step-bg); color: var(--afv-external-step-fg);
      border-left: 4px solid var(--afv-external-step-border);
    }
    .flow-step--nav { cursor: pointer; }
    .flow-step--nav:hover { filter: brightness(0.97); }
    .flow-step .step-name { font-weight: 600; display: block; margin-bottom: 4px; }
    .flow-step .declaring-class {
      font-size: 10px; font-weight: 500; color: var(--afv-class-sub-fg);
      font-family: var(--vscode-editor-font-family, monospace);
      margin-bottom: 4px;
    }
    .flow-step .step-meta { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .flow-step .step-super {
      margin-top: 6px; font-size: 10px; line-height: 1.5;
      padding: 4px 6px; border-radius: 4px;
      background: var(--afv-super-bg); color: var(--afv-super-fg);
      border: 1px solid var(--afv-super-border);
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .flow-step .step-keys { margin-top: 6px; font-size: 10px; line-height: 1.6; }
    .flow-step .keys-label { font-weight: 600; margin-right: 6px; color: var(--afv-keys-label); }
    .flow-step .key-badge {
      display: inline-block; padding: 3px 8px; border-radius: 4px; margin: 3px 4px 3px 0;
      font-family: var(--vscode-editor-font-family, monospace); font-size: 10px; font-weight: 500;
      background: var(--afv-param-badge-bg); color: var(--afv-param-badge-fg);
      border: 1px solid var(--afv-param-badge-border);
    }
    .arrow { text-align: center; font-size: 14px; color: var(--vscode-descriptionForeground); margin: 4px 0; }
    .parallel-banner {
      font-size: 10px; padding: 6px 8px; margin: 4px 0; border-radius: 4px;
      background: var(--afv-parallel-bg); color: var(--afv-parallel-fg);
      border: 1px solid var(--afv-parallel-border);
    }
    .empty-state { text-align: center; padding: 30px 15px; color: var(--vscode-descriptionForeground); }
    .warn { padding: 8px; margin-bottom: 8px; background: var(--afv-warn-bg); color: var(--afv-warn-fg);
      border-radius: 4px; font-size: 11px; border: 1px solid var(--afv-warn-border); }
    .path-hint { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 4px; word-break: break-all; }
    .filter-hint { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3>TestNG Flow Preview</h3>
      <div class="toolbar-row">
        <div class="search-container" id="search-container">
          <button type="button" id="btn-search-icon" title="Search by test method name">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M10.439 11.5a6 6 0 1 1 1.06-1.06l3.72 3.72-1.06 1.06-3.72-3.72zm-4.44.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" fill="currentColor"/>
            </svg>
          </button>
          <input type="text" id="search-input" placeholder="Search methods…" autocomplete="off" />
        </div>
        <select id="class-filter" title="Show only methods declared in this class"></select>
        <button type="button" id="btn-refresh" title="Reload flow from disk">Refresh</button>
      </div>
      <div id="filter-hint" class="filter-hint" style="display:none;"></div>
      <select id="file-select"><option value="">Select a Java file…</option></select>
      <div id="path-hint" class="path-hint"></div>
    </div>
    <div id="warn" class="warn" style="display:none;"></div>
    <div id="content" class="flow-container">
      <div class="empty-state"><p>Use “Open TestNG Flow Diagram” or open a <code>.java</code> file and run “Show TestNG Flow for Active Editor”. Enable <i>Sync preview with active editor</i> in settings for automatic updates.</p></div>
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();

    var state = { files: [], selectedPath: '', flows: {}, appearance: {} };
    var ui = { searchOpen: false, searchQuery: '', filterClass: '' };

    // Avoid the identifier "select" — can clash with legacy DOM APIs in some hosts.
    var fileSelect = document.getElementById('file-select');
    var classFilter = document.getElementById('class-filter');
    var content = document.getElementById('content');
    var warnEl = document.getElementById('warn');
    var pathHint = document.getElementById('path-hint');
    var filterHint = document.getElementById('filter-hint');
    var btnRefresh = document.getElementById('btn-refresh');
    var searchContainer = document.getElementById('search-container');
    var searchInput = document.getElementById('search-input');

    function applyAppearance(vars) {
      if (!vars || typeof vars !== 'object') return;
      var root = document.documentElement;
      for (var k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k) && typeof vars[k] === 'string') {
          root.style.setProperty(k, vars[k]);
        }
      }
    }

    var searchContainer = document.getElementById('search-container');
    var btnSearchIcon = document.getElementById('btn-search-icon');

    function expandSearch() {
      if (!searchContainer) return;
      searchContainer.classList.add('expanded');
      if (searchInput) {
        searchInput.style.display = 'block';
        searchInput.focus();
      }
    }

    function collapseSearch() {
      if (!searchContainer || !searchInput) return;
      if (!searchInput.value.trim()) {
        searchContainer.classList.remove('expanded');
        searchInput.style.display = 'none';
      }
    }

    if (btnSearchIcon) {
      btnSearchIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        expandSearch();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('blur', function() {
        collapseSearch();
      });
      searchInput.addEventListener('input', function() {
        ui.searchQuery = searchInput.value;
        renderFlowBody();
      });
      searchInput.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && searchContainer && searchContainer.classList.contains('expanded')) {
        if (searchInput) searchInput.value = '';
        ui.searchQuery = '';
        renderFlowBody();
        collapseSearch();
      }
    });
    if (btnRefresh) {
      btnRefresh.addEventListener('click', function() {
        vscode.postMessage({ type: 'refresh' });
      });
    }
    if (classFilter) {
      classFilter.addEventListener('change', function() {
        ui.filterClass = classFilter.value || '';
        updateFilterHint();
        renderFlowBody();
      });
    }

    if (content) {
      content.addEventListener('click', function(e) {
        var step = e.target.closest('.flow-step--nav');
        if (!step) return;
        var id = step.getAttribute('data-id');
        if (id) vscode.postMessage({ type: 'openMethod', methodId: id });
      });
    }

    if (fileSelect) {
      fileSelect.addEventListener('change', function(e) {
        var v = e.target.value;
        vscode.postMessage({ type: 'selectFile', path: v });
      });
    }

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg && msg.type === 'updateData') {
        var d = msg.data || {};
        state.files = d.files || [];
        state.selectedPath = d.selectedPath || '';
        state.flows = d.flows || {};
        state.appearance = d.appearance || {};
        applyAppearance(state.appearance);
        render();
      }
    });

    function normalizePathKey(p) {
      if (!p) return '';
      return String(p).replace(/\\\\/g, '/');
    }

    /** Match extension flow key even if slashes/casing differ slightly across hosts. */
    function getFlowForSelected() {
      var p = state.selectedPath;
      if (!p || !state.flows) return null;
      if (state.flows[p]) return state.flows[p];
      var norm = normalizePathKey(p);
      var keys = Object.keys(state.flows);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (state.flows[k] && (k === p || normalizePathKey(k) === norm ||
            k.toLowerCase() === p.toLowerCase() ||
            normalizePathKey(k).toLowerCase() === norm.toLowerCase())) {
          return state.flows[k];
        }
      }
      return null;
    }

    function esc(s) {
      if (!s) return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function methodMatches(n) {
      var q = (ui.searchQuery || '').trim().toLowerCase();
      if (q && String(n.id).toLowerCase().indexOf(q) === -1) return false;
      if (ui.filterClass && n.declaringClass !== ui.filterClass) return false;
      return true;
    }

    function uniqueDeclaringClasses(nodes) {
      var s = {};
      (nodes || []).forEach(function(n) {
        if (n.declaringClass) s[n.declaringClass] = true;
      });
      return Object.keys(s).sort(function(a,b) { return a.localeCompare(b); });
    }

    function updateClassFilterOptions(nodes) {
      if (!classFilter) return;
      var prev = ui.filterClass;
      var classes = uniqueDeclaringClasses(nodes);
      classFilter.innerHTML = '<option value="">All classes</option>';
      classes.forEach(function(c) {
        var o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        classFilter.appendChild(o);
      });
      if (prev && classes.indexOf(prev) >= 0) {
        classFilter.value = prev;
        ui.filterClass = prev;
      } else {
        classFilter.value = '';
        ui.filterClass = '';
      }
    }

    function updateFilterHint() {
      if (!filterHint) return;
      var parts = [];
      var q = (ui.searchQuery || '').trim();
      if (q) parts.push('Search: “' + q + '”');
      if (ui.filterClass) parts.push('Class: ' + ui.filterClass);
      if (parts.length) {
        filterHint.textContent = parts.join(' · ');
        filterHint.style.display = 'block';
      } else {
        filterHint.textContent = '';
        filterHint.style.display = 'none';
      }
    }

    function cardHtml(n) {
      var cls = n.declaredHere ? 'step' : 'external';
      var canNav = !!(n.sourceFilePath && n.line);
      var navCls = canNav ? ' flow-step--nav' : '';
      var navTitle = canNav ? ' title="Go to method declaration"' : '';
      var icon = n.declaredHere ? '⚙️' : '↗';
      var keysHtml = '';
      if (n.parameterKeys && n.parameterKeys.length > 0) {
        keysHtml = '<div class="step-keys"><span class="keys-label">📦 Params:</span>' +
          n.parameterKeys.map(function(k) { return '<span class="key-badge">' + esc(k) + '</span>'; }).join('') + '</div>';
      }
      var classLine = '';
      if (n.declaringClass) {
        classLine = '<div class="declaring-class">' + esc(n.declaringClass) + '</div>';
      }
      var meta = '';
      if (n.description) meta += '<div class="step-meta">' + esc(n.description) + '</div>';
      if (n.line) meta += '<div class="step-meta">Line ' + n.line + '</div>';
      if (!n.declaredHere && !n.declaringClass) {
        meta += '<div class="step-meta">(not declared in merged inheritance — check name)</div>';
      }
      var superHtml = '';
      if (n.superCalls && n.superCalls.length > 0) {
        var calls = n.superCalls.map(function(s) { return '<code>super.' + esc(s) + '()</code>'; }).join(', ');
        superHtml = '<div class="step-super">Calls ' + calls + '</div>';
      }
      return '<div class="flow-step ' + cls + navCls + '" data-id="' + esc(n.id) + '"' + navTitle + '>' +
        '<span class="step-name">' + icon + ' ' + esc(n.id) + '</span>' + classLine + meta + superHtml + keysHtml + '</div>';
    }

    function renderFlowBody() {
      updateFilterHint();
      if (!content) return;
      var flow = getFlowForSelected();
      if (warnEl) warnEl.style.display = 'none';

      if (!flow || !flow.nodes || !flow.nodes.length) {
        content.innerHTML = '<div class="empty-state"><p>No <code>@Test</code> flow could be built for this file.</p></div>';
        return;
      }

      var layers = flow.layers && flow.layers.length ? flow.layers : null;
      var rows = layers || (flow.order || []).map(function(id) { return [id]; });
      var totalSteps = rows.reduce(function(a, r) { return a + r.length; }, 0);
      if (totalSteps === 0) {
        content.innerHTML = '<div class="empty-state"><p>No <code>@Test</code> methods in this flow.</p></div>';
        if (flow.cyclic) {
          warnEl.textContent = 'Dependency cycle detected; layers may be wrong.';
          warnEl.style.display = 'block';
        }
        return;
      }

      if (flow.cyclic) {
        warnEl.textContent = 'Warning: dependsOnMethods graph has a cycle; layers may be incomplete.';
        warnEl.style.display = 'block';
      }

      var nodeMap = {};
      (flow.nodes || []).forEach(function(n) { nodeMap[n.id] = n; });

      var filteredRows = rows.map(function(row) {
        return row.filter(function(id) {
          var n = nodeMap[id];
          return n && methodMatches(n);
        });
      }).filter(function(row) { return row.length > 0; });

      var displayRows = filteredRows;
      var q = (ui.searchQuery || '').trim();
      var hasFilter = !!ui.filterClass || !!q;
      if (hasFilter && displayRows.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No methods match the current search or class filter.</p></div>';
        return;
      }
      if (!hasFilter) {
        displayRows = rows;
      }

      var parallelIdx = flow.parallelLayerIndexes || [];
      var html = '';
      function originalLayerIndexForRow(row) {
        for (var li = 0; li < rows.length; li++) {
          var orig = rows[li];
          if (!row.length) continue;
          var allIn = true;
          for (var i = 0; i < row.length; i++) {
            if (orig.indexOf(row[i]) < 0) { allIn = false; break; }
          }
          if (allIn) return li;
        }
        return -1;
      }
      displayRows.forEach(function(row, li) {
        var origLayer = originalLayerIndexForRow(row);
        var parallel = origLayer >= 0 && parallelIdx.indexOf(origLayer) >= 0;
        if (parallel) {
          html += '<div class="parallel-banner">Parallel: ' + row.length + ' tests share this layer (no <code>dependsOnMethods</code> between them — review ordering).</div>';
        }
        html += '<div class="layer-row">';
        row.forEach(function(id) {
          var n = nodeMap[id];
          if (n) html += cardHtml(n);
        });
        html += '</div>';
        if (li < displayRows.length - 1) html += '<div class="arrow">↓</div>';
      });

      content.innerHTML = html;
    }

    function render() {
      if (!fileSelect) return;
      fileSelect.innerHTML = '<option value="">Select a Java file…</option>';
      (state.files || []).forEach(function(f) {
        var o = document.createElement('option');
        o.value = f.path;
        o.textContent = f.label;
        if (f.path === state.selectedPath) o.selected = true;
        fileSelect.appendChild(o);
      });

      pathHint.textContent = state.selectedPath ? state.selectedPath : '';

      var flow = getFlowForSelected();
      if (flow && flow.nodes) {
        updateClassFilterOptions(flow.nodes);
      } else if (classFilter) {
        classFilter.innerHTML = '<option value="">All classes</option>';
        ui.filterClass = '';
      }

      syncSearchPopover();
      renderFlowBody();
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
