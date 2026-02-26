function updateTypeFields() {
  const type = document.getElementById('mcp-type').value;
  document.getElementById('stdio-fields').style.display = type === 'stdio' ? 'block' : 'none';
  document.getElementById('url-fields').style.display = type !== 'stdio' ? 'block' : 'none';
}

document.getElementById('add-mcp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('mcp-type').value;
  let config;

  if (type === 'stdio') {
    const command = document.getElementById('mcp-command').value.trim();
    const argsRaw = document.getElementById('mcp-args').value.trim();
    const envRaw = document.getElementById('mcp-env').value.trim();
    if (!command) { showToast('Comando é obrigatório para stdio', 'error'); return; }
    config = {
      command,
      args: argsRaw ? argsRaw.split(/\s+/) : [],
      env: envRaw ? JSON.parse(envRaw) : undefined,
    };
  } else {
    const url = document.getElementById('mcp-url').value.trim();
    if (!url) { showToast('URL é obrigatória', 'error'); return; }
    config = { url };
  }

  const body = {
    id: document.getElementById('mcp-id').value.trim(),
    name: document.getElementById('mcp-name').value.trim(),
    type,
    config,
  };

  try {
    await API.post('/mcp-servers', body);
    showToast('Servidor adicionado e conectado!');
    document.getElementById('add-mcp-form').reset();
    updateTypeFields();
    loadMcpServers();
  } catch (e) {
    showToast(`Erro: ${e.message}`, 'error');
  }
});

async function loadMcpServers() {
  const list = document.getElementById('mcp-list');
  try {
    const servers = await API.get('/mcp-servers');
    if (!servers.length) {
      list.innerHTML = '<p class="muted">Nenhum servidor cadastrado.</p>';
      return;
    }
    list.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Nome</th><th>Tipo</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${servers.map((s) => `
            <tr>
              <td>
                <strong>${escHtml(s.name)}</strong><br>
                <span class="muted small">${escHtml(s.id)}</span>
              </td>
              <td><span class="badge badge-${s.type}">${s.type}</span></td>
              <td>
                <span class="dot ${s.connected ? 'dot-open' : 'dot-disconnected'}"></span>
                ${s.enabled ? (s.connected ? 'Conectado' : 'Erro') : 'Desativado'}
              </td>
              <td class="actions">
                <button class="btn btn-sm ${s.enabled ? 'btn-warning' : 'btn-primary'}"
                  onclick="toggleServer('${s.id}')">
                  ${s.enabled ? 'Desativar' : 'Ativar'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteServer('${s.id}')">
                  Remover
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    list.innerHTML = `<p class="error">Erro: ${e.message}</p>`;
  }
}

async function toggleServer(id) {
  try {
    const res = await API.patch(`/mcp-servers/${id}/toggle`);
    showToast(res.enabled ? 'Servidor ativado' : 'Servidor desativado');
    loadMcpServers();
  } catch (e) {
    showToast(`Erro: ${e.message}`, 'error');
  }
}

async function deleteServer(id) {
  if (!confirm(`Remover o servidor "${id}"?`)) return;
  try {
    await API.delete(`/mcp-servers/${id}`);
    showToast('Servidor removido');
    loadMcpServers();
  } catch (e) {
    showToast(`Erro: ${e.message}`, 'error');
  }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadMcpServers();
