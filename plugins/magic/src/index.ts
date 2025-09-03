import { utils, IPlugin, fetch } from '@public/api';

const createMagicPlugin: IPlugin = () => ({
  async onEnter(command, options) {
    let actId = options.query;
    if (options.from === 'match' && options.match.type === 'regexp') {
      actId = (options as any).matchData.matches[2];
      if (!Number(actId)) {
        const r = await fetch(
          `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=3000&type=1&option=3&act_id=${actId}&device_channel_id=&device_version=&device_brand=&app_version=&otype=xjson`,
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
    if (command.name === 'editor') {
      utils.open(`https://magic.woa.com/v5/editor/${actId}?actId=${actId}`);
      return;
    }
    if (command.name === 'mod') {
      utils.open(`https://magic.woa.com/v5/act/view/${actId}`);
      return;
    }
  },
});

export default createMagicPlugin;

