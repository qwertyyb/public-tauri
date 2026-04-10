import { utils, fetch, definePlugin } from '@public/api';

const openPage = async (input: string, page: string) => {
  let actId = Number(input);
  if (!actId) {
    const regexp = /https:\/\/.*\/magic-act(-beta|-dev)?\/([0-9a-zA-Z]+)/;
    const matches = input?.match(regexp);
    if (matches && !Number(matches[2])) {
      const r = await fetch(
        `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=3000&type=1&option=3&act_id=${matches[2]}&device_channel_id=&device_version=&device_brand=&app_version=&otype=xjson`,
        {
          headers: {
            referer: 'https://film.video.qq.com',
          },
        },
      );
      const json = await r.json();
      actId = json.id;
    }
  }
  if (!Number(actId)) return;
  if (page === 'editor') {
    utils.open(`https://magic.woa.com/v5/editor/${actId}?actId=${actId}`);
    return;
  }
  if (page === 'mod') {
    utils.open(`https://magic.woa.com/v5/act/view/${actId}`);
    return;
  }
};

const createMagicPlugin = definePlugin(() => ({
  async onEnter(command, query) {
    return openPage(query, command.name);
  },
  async onAction(command, action, keyword) {
    return openPage(keyword, command.name);
  },
}));

export default createMagicPlugin;

