async function loadChats() {
  const list = document.getElementById('chats-list');
  try {
    const chats = await API.get('/chats');
    if (!chats.length) {
      list.innerHTML = '<p class="muted">Nenhum chat conhecido ainda. Envie uma mensagem para o bot primeiro.</p>';
      return;
    }
    list.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Chat</th><th>JID</th><th>Agente</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${chats.map((c) => `
            <tr id="row-${encodeURIComponent(c.jid)}">
              <td>${escHtml(c.name || c.jid)}</td>
              <td class="muted small">${escHtml(c.jid)}</td>
              <td>
                <span class="badge ${c.agent_active ? 'badge-active' : 'badge-inactive'}">
                  ${c.agent_active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm ${c.agent_active ? 'btn-danger' : 'btn-primary'}"
                  onclick="toggleAgent('${encodeURIComponent(c.jid)}', ${!c.agent_active})">
                  ${c.agent_active ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    list.innerHTML = `<p class="error">Erro: ${e.message}</p>`;
  }
}

async function toggleAgent(encodedJid, active) {
  const jid = decodeURIComponent(encodedJid);
  try {
    await API.patch(`/chats/${encodedJid}/agent`, { active });
    showToast(active ? 'Agente ativado' : 'Agente desativado');
    loadChats();
  } catch (e) {
    showToast(`Erro: ${e.message}`, 'error');
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadChats();
