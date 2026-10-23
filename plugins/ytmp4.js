const yts = require('yt-search');

module.exports = {
    name: 'ymp4',
    description: 'Download YouTube video as MP4 (link or search)',
    aliases: ['ytmp4', 'ytvideo'],
    tags: ['downloader'],
    command: /^\.?(ymp4|ytmp4|ytvideo)\b/i,

    async execute(sock, m, args) {
        const chatId = m.key.remoteJid;
        const input = args.join(' ').trim();

        if (!input) {
            return m.reply('Usage:\n.ymp4 <YouTube link or search query>');
        }

        try {
            await sock.sendMessage(chatId, {
                react: { text: '🎬', key: m.key }
            });

            let finalUrl = input;
            let searchInfo = null;

            if (!/^https?:\/\//i.test(input)) {
                const results = await yts(input);

                if (!results?.videos?.length) {
                    return m.reply('❌ No YouTube results found.');
                }

                searchInfo = results.videos[0];
                finalUrl = searchInfo.url;
            }

            let parsedUrl;

            try {
                parsedUrl = new URL(finalUrl);
            } catch {
                return m.reply('❌ Invalid YouTube URL.');
            }

            const hostname = parsedUrl.hostname
                .toLowerCase()
                .replace(/^www\./, '')
                .replace(/^m\./, '');

            if (
                hostname !== 'youtube.com' &&
                hostname !== 'youtu.be' &&
                !hostname.endsWith('.youtube.com')
            ) {
                return m.reply('❌ Please provide a valid YouTube link.');
            }

            const apiUrl =
                'https://api-abztech.zone.id/download/omdown?url=' +
                encodeURIComponent(finalUrl);

            const apiRes = await fetch(apiUrl);

            if (!apiRes.ok) {
                throw new Error(`API error: HTTP ${apiRes.status}`);
            }

            const data = await apiRes.json();

            if (data?.success !== true) {
                throw new Error(
                    data?.message || 'Failed to retrieve video.'
                );
            }

            const title =
                data.title ||
                searchInfo?.title ||
                'YouTube Video';

            const formats = Array.isArray(data.formats)
                ? data.formats
                : [];

            const videos = formats
                .filter(f =>
                    f?.kind === 'video' &&
                    f?.ext === 'mp4' &&
                    typeof f?.url === 'string' &&
                    /^https?:\/\//i.test(f.url)
                )
                .map(f => ({
                    ...f,
                    quality: Number(
                        f.label?.match(/(\d+)p/i)?.[1] || 0
                    )
                }))
                .sort((a, b) => b.quality - a.quality);

            const selected =
                videos.find(v => v.quality === 720) ||
                videos.filter(v => v.quality > 0 && v.quality < 720)
                    .sort((a, b) => b.quality - a.quality)[0] ||
                videos[0];

            if (!selected) {
                return m.reply('❌ No downloadable MP4 format found.');
            }

            await m.reply(
                `⏳ Downloading video...\n\n` +
                `🎬 ${title}\n` +
                `📺 Quality: ${selected.label || 'MP4'}`
            );

            const videoRes = await fetch(selected.url);

            if (!videoRes.ok) {
                throw new Error(
                    `Video download failed: HTTP ${videoRes.status}`
                );
            }

            const contentType =
                videoRes.headers.get('content-type') || '';

            if (
                contentType.includes('text/html') ||
                contentType.includes('application/json')
            ) {
                throw new Error('API returned invalid video data.');
            }

            const buffer = Buffer.from(
                await videoRes.arrayBuffer()
            );

            if (!buffer.length) {
                throw new Error('Downloaded video is empty.');
            }

            const MAX_SIZE = 64 * 1024 * 1024;

            if (buffer.length > MAX_SIZE) {
                return m.reply(
                    '❌ Video exceeds the 64 MB upload limit.'
                );
            }

            const safeName = title
                .replace(/[\\/:*?"<>|]/g, '')
                .trim()
                .slice(0, 100) || 'video';

            await sock.sendMessage(
                chatId,
                {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${safeName}.mp4`,
                    caption:
                        `🎬 ${title}\n\n` +
                        `📺 Quality: ${selected.label || 'MP4'}\n` +
                        `👑 AB-ZTECH 🇬🇭`,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid:
                                '120363230794474148@newsletter',
                            newsletterName:
                                '𝘈𝘉-𝘡𝘛𝘌𝘊𝘏🇬🇭「 𝙏𝙞𝙢𝙚 - 𝙏𝙞𝙢𝙚𝙡𝙚𝙨𝙨 」',
                            serverMessageId: 1
                        }
                    }
                },
                m.quoted ? { quoted: m.quoted } : {}
            );

            await sock.sendMessage(chatId, {
                react: { text: '✅', key: m.key }
            });

        } catch (err) {
            console.error('YMP4 error:', err);

            await m.reply(
                `❌ Download failed.\n\n${err.message || 'Unknown error'}`
            );
        }
    }
};
