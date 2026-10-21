const axios = require('axios');
const fs = require('fs');

module.exports = {
    name: 'tiktok',
    description: 'Download TikTok videos without watermark',
    aliases: ['tt', 'tiktokdl', 'ttdl'],
    tags: ['downloader'],
    command: /^\.?(tiktok|tt|tiktokdl|ttdl)$/i,

    async execute(sock, m, args) {
        try {
            if (!args.length) {
                return await m.reply(`ᴜsᴀɢᴇ: .ᴛɪᴋᴛᴏᴋ <ᴜʀʟ>

ᴇxᴀᴍᴘʟᴇ: .ᴛɪᴋᴛᴏᴋ https://www.tiktok.com/@scout2015/video/6718335390845095173`);
            }

            const url = args[0];

            if (!url.includes('tiktok.com')) {
                return await m.reply('ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴠᴀʟɪᴅ ᴛɪᴋᴛᴏᴋ ᴜʀʟ');
            }

            await m.reply('ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ...');

            const apiUrl = `https://api-rebix.zone.id/api/ttdl?url=${encodeURIComponent(url)}`;

            const response = await axios.get(apiUrl);

            if (!response.data.status || !response.data.result) {
                return await m.reply('ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ\nᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ');
            }

            const result = response.data.result;

            const videoData = result.data?.find(item => item.type === 'nowatermark')
                || result.data?.find(item => item.type === 'nowatermark_hd');

            if (!videoData || !videoData.url) {
                return await m.reply('ɴᴏ ᴠɪᴅᴇᴏ ᴜʀʟ ғᴏᴜɴᴅ');
            }

            const videoUrl = videoData.url;

            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer'
            });

            const videoBuffer = Buffer.from(videoResponse.data);
            const fileName = `tiktok_${result.id}.mp4`;
            const filePath = `./temp/${fileName}`;

            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp', { recursive: true });
            }

            fs.writeFileSync(filePath, videoBuffer);

            const stats = result.stats || {};
            const author = result.author || {};

            const caption = `*ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*

ᴛɪᴛʟᴇ: ${result.title || 'ɴᴏ ᴛɪᴛʟᴇ'}
ᴅᴜʀᴀᴛɪᴏɴ: ${result.duration || 'ɴ/ᴀ'}
ᴠɪᴇᴡs: ${stats.views || 0}
ʟɪᴋᴇs: ${stats.likes || 0}
ᴄᴏᴍᴍᴇɴᴛs: ${stats.comment || 0}
sʜᴀʀᴇs: ${stats.share || 0}

ᴀᴜᴛʜᴏʀ: ${author.nickname || 'ᴜɴᴋɴᴏᴡɴ'}
@${author.fullname || ''}

ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ʙʏ XLICON V2`;

            await sock.sendMessage(m.from, {
                video: fs.readFileSync(filePath),
                caption: caption,
                mimetype: 'video/mp4'
            });

            fs.unlinkSync(filePath);

        } catch (err) {
            console.error('TikTok Error:', err);
            await m.reply(`ᴇʀʀᴏʀ: ${err.message}`);
        }
    }
};
