interface EmbedConfig {
  apiUrl: string;
  chatbotId: string;
}

export function buildEmbedScript(config: EmbedConfig): string {
  return `
(function () {
  var CONFIG = {
    apiUrl: ${JSON.stringify(config.apiUrl)},
    chatbotId: ${JSON.stringify(config.chatbotId)}
  };

  function getToken() {
    var scripts = document.querySelectorAll('script[data-chatbot]');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute('data-chatbot') === CONFIG.chatbotId) {
        return scripts[i].getAttribute('data-token') || '';
      }
    }
    return '';
  }

  function getVisitorId() {
    var key = 'flowix_visitor_' + CONFIG.chatbotId;
    var existing = localStorage.getItem(key);
    if (existing) return existing;
    var id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
    return id;
  }

  function getHistory() {
    var key = 'flowix_history_' + CONFIG.chatbotId;
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setHistory(history) {
    var key = 'flowix_history_' + CONFIG.chatbotId;
    try {
      localStorage.setItem(key, JSON.stringify(history.slice(-20)));
    } catch (e) {}
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function injectStyles(color) {
    var style = document.createElement('style');
    style.textContent = [
      '.flowix-widget{position:fixed;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.flowix-launcher{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;color:#fff;transition:transform .15s ease}',
      '.flowix-launcher:hover{transform:scale(1.05)}',
      '.flowix-window{position:fixed;z-index:2147483001;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 100px);border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.22);background:#fff;display:flex;flex-direction:column;overflow:hidden;font-size:14px;line-height:1.5}',
      '.flowix-header{color:#fff;padding:14px 16px;font-weight:600;display:flex;align-items:center;justify-content:space-between}',
      '.flowix-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1}',
      '.flowix-messages{flex:1;overflow-y:auto;padding:16px;background:#f6f7fa;display:flex;flex-direction:column;gap:8px}',
      '.flowix-bubble{max-width:80%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;font-size:13.5px}',
      '.flowix-user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px}',
      '.flowix-bot{align-self:flex-start;background:#fff;border:1px solid #e2e6ee;border-bottom-left-radius:4px}',
      '.flowix-tool{font-size:11px;color:#8792a8;padding:2px 4px}',
      '.flowix-input-wrap{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #e2e6ee;background:#fff}',
      '.flowix-input{flex:1;border:1px solid #e2e6ee;border-radius:20px;padding:8px 14px;outline:none;font-size:13.5px;font-family:inherit}',
      '.flowix-input:focus{border-color:' + color + '}',
      '.flowix-attach{background:none;border:none;cursor:pointer;color:#8792a8;padding:0 4px;display:flex;align-items:center}',
      '.flowix-attach:hover{color:' + color + '}',
      '.flowix-file-chip{font-size:11px;background:#f1f3f8;border:1px solid #e2e6ee;border-radius:8px;padding:4px 8px;color:#48556a;display:flex;align-items:center;gap:6px}',
      '.flowix-file-chip button{background:none;border:none;cursor:pointer;color:#c4453c;font-size:13px;line-height:1}',
      '.flowix-send{border:none;border-radius:50%;width:36px;height:36px;color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}',
      '.flowix-dots{display:inline-flex;gap:4px;padding:4px}',
      '.flowix-dots span{width:7px;height:7px;border-radius:50%;background:#c2cbd9;animation:flowixBlink 1.2s infinite}',
      '.flowix-dots span:nth-child(2){animation-delay:.2s}',
      '.flowix-dots span:nth-child(3){animation-delay:.4s}',
      '@keyframes flowixBlink{0%,80%,100%{opacity:.3}40%{opacity:1}}',
      '.flowix-powered{font-size:10px;color:#8792a8;text-align:center;padding:6px;background:#fff}'
    ].join('');
    document.head.appendChild(style);
  }

  function buildWidget(widgetConfig) {
    var color = widgetConfig.primaryColor || '#010a35';
    var position = widgetConfig.position || 'bottom-right';
    var isLeft = position === 'bottom-left';
    injectStyles(color);

    var wrap = document.createElement('div');
    wrap.className = 'flowix-widget';
    wrap.style.bottom = '16px';
    wrap.style.right = isLeft ? 'auto' : '16px';
    wrap.style.left = isLeft ? '16px' : 'auto';

    var launcher = document.createElement('button');
    launcher.className = 'flowix-launcher';
    launcher.style.background = color;
    launcher.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>';
    launcher.setAttribute('aria-label', 'Abrir chat');

    var windowEl = document.createElement('div');
    windowEl.className = 'flowix-window';
    windowEl.style.display = 'none';
    windowEl.style.right = isLeft ? 'auto' : '0';
    windowEl.style.left = isLeft ? '0' : 'auto';

    var header = document.createElement('div');
    header.className = 'flowix-header';
    header.style.background = color;
    header.innerHTML = '<span>' + escapeHtml(widgetConfig.name || 'Asistente') + '</span>' +
      '<button class="flowix-close" aria-label="Cerrar">&times;</button>';

    var messages = document.createElement('div');
    messages.className = 'flowix-messages';

    var inputWrap = document.createElement('div');
    inputWrap.className = 'flowix-input-wrap';
    var attach = document.createElement('button');
    attach.className = 'flowix-attach';
    attach.type = 'button';
    attach.title = 'Adjuntar archivo';
    attach.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    var input = document.createElement('textarea');
    input.className = 'flowix-input';
    input.rows = 1;
    input.placeholder = widgetConfig.placeholder || 'Escribí tu consulta…';
    var send = document.createElement('button');
    send.className = 'flowix-send';
    send.style.background = color;
    send.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    var filesBar = document.createElement('div');
    filesBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 6px;background:#fff';
    inputWrap.appendChild(attach);
    inputWrap.appendChild(fileInput);
    inputWrap.appendChild(input);
    inputWrap.appendChild(send);

    if (widgetConfig.allowFileUpload !== true) {
      attach.style.display = 'none';
    }

    var powered = document.createElement('div');
    powered.className = 'flowix-powered';
    powered.style.display = widgetConfig.showPoweredBy === false ? 'none' : 'block';
    powered.textContent = 'Powered by Flowix';

    windowEl.appendChild(header);
    windowEl.appendChild(messages);
    windowEl.appendChild(filesBar);
    windowEl.appendChild(inputWrap);
    windowEl.appendChild(powered);

    wrap.appendChild(launcher);
    wrap.appendChild(windowEl);
    document.body.appendChild(wrap);

    var open = false;
    var history = getHistory();
    var pendingFileText = '';

    function addFileChip(name, onRemove) {
      var chip = document.createElement('div');
      chip.className = 'flowix-file-chip';
      chip.textContent = '📎 ' + name;
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Quitar archivo');
      remove.addEventListener('click', function () {
        chip.remove();
        if (onRemove) onRemove();
      });
      chip.appendChild(remove);
      filesBar.appendChild(chip);
    }

    attach.addEventListener('click', function () {
      if (widgetConfig.allowFileUpload !== true) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var originalName = file.name;
      var typing = addTyping();
      typing.textContent = 'Subiendo ' + originalName + '…';

      var formData = new FormData();
      formData.append('file', file);
      formData.append('token', getToken());

      fetch(CONFIG.apiUrl + '/chatbots/' + CONFIG.chatbotId + '/upload', {
        method: 'POST',
        body: formData
      }).then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.message || 'No se pudo subir el archivo');
          });
        }
        return response.json();
      }).then(function (data) {
        typing.remove();
        var text = String(data.text || '').slice(0, 20000);
        pendingFileText = pendingFileText
          ? pendingFileText + '\n\n[Archivo: ' + originalName + ']\n' + text
          : '[Archivo: ' + originalName + ']\n' + text;
        addFileChip(originalName, function () {
          pendingFileText = '';
        });
      }).catch(function (error) {
        typing.textContent = '⚠ ' + (error.message || 'No se pudo subir el archivo');
      });

      fileInput.value = '';
    });

    function addMessage(role, text) {
      var bubble = document.createElement('div');
      bubble.className = 'flowix-bubble ' + (role === 'user' ? 'flowix-user' : 'flowix-bot');
      if (role === 'user') bubble.style.background = color;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    function addTyping() {
      var bubble = document.createElement('div');
      bubble.className = 'flowix-bubble flowix-bot';
      bubble.innerHTML = '<span class="flowix-dots"><span></span><span></span><span></span></span>';
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
      return bubble;
    }

    function addTool(name) {
      var tool = document.createElement('div');
      tool.className = 'flowix-tool';
      tool.textContent = '⚙ ' + name + '…';
      messages.appendChild(tool);
      messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
      var text = input.value.trim();
      if (!text && !pendingFileText) return;
      var finalContent = pendingFileText ? pendingFileText + '\n\n' + text : text;
      input.value = '';
      input.style.height = 'auto';

      addMessage('user', text || '📎 ' + (pendingFileText.split('\\n')[0].replace('[Archivo: ', '').replace(']', '')) || 'Adjunto');
      var typing = addTyping();

      var body = JSON.stringify({
        token: getToken(),
        content: finalContent,
        history: history
      });

      history = history.concat({ role: 'user', content: finalContent });
      pendingFileText = '';
      filesBar.innerHTML = '';

      fetch(CONFIG.apiUrl + '/chatbots/' + CONFIG.chatbotId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (response) {
        if (!response.ok) {
          return response.json().then(function (data) {
            throw new Error(data.message || 'Error de conexión');
          });
        }
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var finalText = '';
        var eventType = '';

        function read() {
          return reader.read().then(function (result) {
            if (result.done) {
              if (finalText) {
                history = history.concat({ role: 'assistant', content: finalText });
                setHistory(history);
              }
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            var lines = buffer.split('\\n');
            buffer = lines.pop() || '';

            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (line.indexOf('event: ') === 0) {
                eventType = line.slice(7);
              } else if (line.indexOf('data: ') === 0) {
                var data = line.slice(6);
                try {
                  var parsed = JSON.parse(data);
                  if (eventType === 'content.delta') {
                    finalText += parsed.delta || '';
                    typing.textContent = finalText;
                    messages.scrollTop = messages.scrollHeight;
                  } else if (eventType === 'tool.started') {
                    addTool(parsed.name || 'herramienta');
                  } else if (eventType === 'message.completed') {
                    finalText = parsed.content || finalText;
                    typing.textContent = finalText;
                    messages.scrollTop = messages.scrollHeight;
                  } else if (eventType === 'error') {
                    typing.textContent = '⚠ ' + (parsed.message || 'Error');
                  }
                } catch (e) {}
              }
            }
            return read();
          });
        }

        return read();
      }).catch(function (error) {
        typing.textContent = '⚠ ' + (error.message || 'Error de conexión');
      });
    }

    function openWidget() {
      open = true;
      windowEl.style.display = 'flex';
      launcher.style.display = 'none';
      if (open && history.length === 0 && widgetConfig.welcomeMessage) {
        addMessage('bot', widgetConfig.welcomeMessage);
      }
      if (open) input.focus();
    }

    launcher.addEventListener('click', function () {
      if (open) {
        open = false;
        windowEl.style.display = 'none';
        launcher.style.display = 'flex';
      } else {
        openWidget();
      }
    });

    header.querySelector('.flowix-close').addEventListener('click', function () {
      open = false;
      windowEl.style.display = 'none';
      launcher.style.display = 'flex';
    });

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    if (widgetConfig.autoOpen === true) {
      openWidget();
    }
  }

  function init() {
    var token = getToken();
    if (!token) {
      console.error('[Flowix] Falta el atributo data-token en el script del chatbot');
      return;
    }
    fetch(CONFIG.apiUrl + '/chatbots/' + CONFIG.chatbotId + '/config?token=' + encodeURIComponent(token), {
      headers: { 'Origin': window.location.origin }
    }).then(function (response) {
      if (!response.ok) throw new Error('Config error');
      return response.json();
    }).then(function (data) {
      buildWidget(data.chatbot);
    }).catch(function (error) {
      console.error('[Flowix] No se pudo cargar el chatbot:', error);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
