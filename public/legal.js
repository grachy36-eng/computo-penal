fetch('/api/config').then(r => r.json()).then(c => {
  if (c.contacto) document.querySelectorAll('.contacto').forEach(el => { el.textContent = c.contacto; });
}).catch(() => {});
