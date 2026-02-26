const STATUS_LABELS = {
  open: 'Conectado',
  connecting: 'Conectando...',
  disconnected: 'Desconectado',
};

async function updateStatus() {
  try {
    const data = await API.get('/status');
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const qrContainer = document.getElementById('qr-container');
    const qrImg = document.getElementById('qr-img');

    dot.className = `dot dot-${data.status}`;
    text.textContent = STATUS_LABELS[data.status] ?? data.status;

    if (data.qr) {
      qrContainer.style.display = 'block';
      qrImg.src = data.qr;
    } else {
      qrContainer.style.display = 'none';
    }
  } catch (e) {
    document.getElementById('status-text').textContent = 'Erro ao carregar status';
  }
}

async function updateMcpStatus() {
  try {
    const servers = await API.get('/mcp-servers');
    const list = document.getElementById('mcp-connected-list');
    if (!servers.length) {
      list.innerHTML = '<p class="muted">Nenhum MCP server cadastrado.</p>';
      return;
    }
    list.innerHTML = servers
      .map(
        (s) => `
      <div class="mcp-item">
        <span class="dot ${s.connected ? 'dot-open' : 'dot-disconnected'}"></span>
        <strong>${s.name}</strong>
        <span class="badge badge-${s.type}">${s.type}</span>
        <span class="muted">${s.tools?.length ?? 0} tools</span>
      </div>`
      )
      .join('');
  } catch {
    document.getElementById('mcp-connected-list').textContent = 'Erro ao carregar MCPs';
  }
}

updateStatus();
updateMcpStatus();
setInterval(updateStatus, 3000);
setInterval(updateMcpStatus, 10000);
