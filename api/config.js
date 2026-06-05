export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.__CM_ANTHROPIC_KEY__ = "${process.env.ANTHROPIC_KEY || ''}";
    window.__CM_ELEVENLABS_KEY__ = "${process.env.ELEVENLABS_KEY || ''}";
  `);
}
