export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {} 
  }

  const { text, lang } = body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const IMAGE_URL = 'https://create-images-results.d-id.com/google-oauth2%7C100222099921528415196/upl_ZqOvKgp_V25Fh-ywBIhdz/image.png';
  
  // Language to voice mapping
  const VOICE_MAP = {
    es: { provider: 'microsoft', id: 'es-AR-TomasNeural' },
    en: { provider: 'microsoft', id: 'en-US-GuyNeural' },
    pt: { provider: 'microsoft', id: 'pt-BR-AntonioNeural' },
    de: { provider: 'microsoft', id: 'de-DE-ConradNeural' },
    ja: { provider: 'microsoft', id: 'ja-JP-KeitaNeural' },
    zh: { provider: 'microsoft', id: 'zh-CN-YunxiNeural' },
    tr: { provider: 'microsoft', id: 'tr-TR-AhmetNeural' },
  };
  
  const voice = VOICE_MAP[lang] || VOICE_MAP.es;

  try {
    // Step 1: Create the talk
    const createRes = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.DID_API_KEY}`,
      },
      body: JSON.stringify({
        source_url: IMAGE_URL,
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'microsoft',
            voice_id: voice.id,
          }
        },
        config: {
          fluent: true,
          pad_audio: 0,
          stitch: true,
        }
      }),
    });

    const createData = await createRes.json();
    
    if (createData.error || !createData.id) {
      return res.status(400).json({ error: createData.message || 'D-ID error', detail: createData });
    }

    const talkId = createData.id;

    // Step 2: Poll for result (max 30 seconds)
    let videoUrl = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const pollRes = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: { 'Authorization': `Basic ${process.env.DID_API_KEY}` }
      });
      const pollData = await pollRes.json();
      
      if (pollData.status === 'done' && pollData.result_url) {
        videoUrl = pollData.result_url;
        break;
      }
      if (pollData.status === 'error') {
        return res.status(500).json({ error: 'D-ID processing error', detail: pollData });
      }
    }

    if (!videoUrl) {
      return res.status(504).json({ error: 'Timeout waiting for video' });
    }

    return res.status(200).json({ videoUrl, talkId });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
