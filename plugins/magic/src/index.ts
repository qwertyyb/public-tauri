import { fetch, definePlugin, opener } from '@public/api';

const createMagicPlugin = definePlugin(() => ({
  async onEnter(command, query) {
    query = query.trim();
    let actId = Number(query);
    if (!actId) {
      let encryptedActId = '';
      if (/^[0-9a-zA-Z]+$/.test(query)) {
        encryptedActId = query;
      } else {
        const regexp = /\/magic-act(-beta|-dev)?\/([0-9a-zA-Z]+)/;
        const matches = query?.match(regexp);
        encryptedActId = matches?.[2] || '';
      }
      if (!encryptedActId) return;
      if (isNaN(Number(encryptedActId))) {
        const r = await fetch(
          `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=3000&type=1&option=3&act_id=${encryptedActId}&device_channel_id=&device_version=&device_brand=&app_version=&otype=xjson`,
          {
            headers: {
              referer: 'https://film.video.qq.com',
            },
          },
        );
        const json = await r.json();
        actId = json.id;
      } else {
        actId = Number(encryptedActId);
      }
    }
    if (!Number(actId)) return;
    if (command.name === 'editor') {
      opener.openUrl(`https://magic.woa.com/v5/editor/${actId}?actId=${actId}`);
      return;
    }
    if (command.name === 'mod') {
      opener.openUrl(`https://magic.woa.com/v5/act/view/${actId}`);
      return;
    }
  },
}));

export default createMagicPlugin;

