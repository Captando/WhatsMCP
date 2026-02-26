async function loadSettings() {
  try {
    const s = await API.get('/settings');
    document.getElementById('system-prompt').value = s.system_prompt ?? '';
    document.getElementById('model').value = s.model ?? 'claude-sonnet-4-6';
    document.getElementById('max-tokens').value = s.max_tokens ?? 8096;
    document.getElementById('max-history').value = s.max_history_messages ?? 50;
  } catch (e) {
    showToast(`Erro ao carregar: ${e.message}`, 'error');
  }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.put('/settings', {
      system_prompt: document.getElementById('system-prompt').value,
      model: document.getElementById('model').value,
      max_tokens: parseInt(document.getElementById('max-tokens').value, 10),
      max_history_messages: parseInt(document.getElementById('max-history').value, 10),
    });
    showToast('Configurações salvas!');
  } catch (e) {
    showToast(`Erro: ${e.message}`, 'error');
  }
});

loadSettings();
