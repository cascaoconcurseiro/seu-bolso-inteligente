fetch('https://seu-bolso-inteligente-knlra62f9-wesleys-projects-de111a83.vercel.app/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: "Test" }]
  })
}).then(r => r.text()).then(t => console.log('Response:', t)).catch(console.error);
