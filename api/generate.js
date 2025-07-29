const axios = require('axios');
const crypto = require('crypto');

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Hanya POST' });
  }

  const { prompt, model = 'veo-3-fast', auto_sound = false, auto_speech = false } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt diperlukan' });

  const validModels = ['veo-3-fast', 'veo-3'];
  if (!validModels.includes(model)) {
    return res.status(400).json({ error: `Model: ${validModels.join(', ')}` });
  }

  try {
    // Dapatkan token Turnstile
    const { data: cf } = await axios.get('https://api.nekorinn.my.id/tools/rynn-stuff', {
      params: {
        mode: 'turnstile-min',
        siteKey: '0x4AAAAAAAdJZmNxW54o-Gvd',
        url: 'https://lunaai.video/features/v3-fast',
        accessKey: '5238b8ad01dd627169d9ac2a6c843613d6225e6d77a6753c75dc5d3f23813653'
      }
    });

    const uid = crypto.createHash('md5').update(Date.now().toString()).digest('hex');

    // Buat tugas
    const { data: task } = await axios.post('https://aiarticle.erweima.ai/api/v1/secondary-page/api/create', {
      prompt,
      imgUrls: [],
      quality: '720p',
      duration: 8,
      autoSoundFlag: auto_sound,
      soundPrompt: '',
      autoSpeechFlag: auto_speech,
      speechPrompt: '',
      speakerId: 'Auto',
      aspectRatio: '16:9',
      secondaryPageId: 1811,
      channel: 'VEO3',
      source: 'lunaai.video',
      type: 'features',
      watermarkFlag: true,
      privateFlag: true,
      isTemp: true,
      vipFlag: true,
      model
    }, {
      headers: { uniqueid: uid, verify: cf.result.token }
    });

    const recordId = task.data.recordId;

    // Polling (maks 60 detik)
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000)); // tunggu 3 detik
      const { data } = await axios.get(`https://aiarticle.erweima.ai/api/v1/secondary-page/api/${recordId}`, {
        headers: { uniqueid: uid, verify: cf.result.token }
      });

      if (data.data.state === 'success') {
        const result = JSON.parse(data.data.completeData);
        return res.status(200).json(result);
      }
      if (data.data.state === 'failed') {
        return res.status(500).json({ error: 'Gagal membuat video' });
      }
    }

    return res.status(504).json({ error: 'Timeout: Tunggu terlalu lama' });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
